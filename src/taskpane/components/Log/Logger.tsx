import * as React from 'react';
import './Logger.css';
import { ContentType, HttpVerb, sendHttpRequest } from '../../../utils/httpRequest';
import AppContext from '../AppContext';
import api from '../../api';
import { Spinner, SpinnerSize, TooltipHost } from 'office-ui-fabric-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { OdooTheme } from '../../../utils/Themes';
import { _t } from '../../../utils/Translator';

//total attachments size threshold in megabytes
const SIZE_THRESHOLD_TOTAL = 40;

//single attachment size threshold in megabytes
const SIZE_THRESHOLD_SINGLE_ELEMENT = 10;

type LoggerProps = {
    resId: number;
    model: string;
    tooltipContent: string;
};

type LoggerState = {
    logged: number;
};

class Logger extends React.Component<LoggerProps, LoggerState> {
    constructor(props, context) {
        super(props, context);
        this.state = {
            logged: 0,
        };
    }

    private fetchAttachmentContent(attachment, index): Promise<any> {
        return new Promise<any>((resolve) => {
            if (attachment.size > SIZE_THRESHOLD_SINGLE_ELEMENT * 1024 * 1024) {
                resolve({
                    name: attachment.name,
                    inline: attachment.isInline && attachment.contentType.indexOf('image') >= 0,
                    oversize: true,
                    index: index,
                });
            }
            Office.context.mailbox.item.getAttachmentContentAsync(attachment.id, (asyncResult) => {
                resolve({
                    name: attachment.name,
                    content: asyncResult.value.content,
                    inline: attachment.isInline && attachment.contentType.indexOf('image') >= 0,
                    oversize: false,
                    index: index,
                });
            });
        });
    }

private logRequest = async (event): Promise<any> => {
    console.log('---------------------------logRequest');
    event.stopPropagation();

    const item = Office.context.mailbox.item;

    // 🔍 Detect whether we are in Compose mode by checking if body.setAsync exists
    const isCompose = typeof item.body.setAsync === 'function';
    this.setState({ logged: 1 });

    // ✉️ Helper to get "To" recipients in Compose mode
    const getComposeRecipients = (): Promise<string[]> => {
        return new Promise((resolve) => {
            if ((item as any).to?.getAsync) {
                (item as any).to.getAsync((result) => {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        const emails = result.value.map((entry) => entry.emailAddress);
                        resolve(emails);
                    } else {
                        resolve([]);
                    }
                });
            } else {
                resolve([]);
            }
        });
    };

    // 📎 Helper to get attachments in Compose mode
    const getComposeAttachments = (): Promise<any[]> => {
        return new Promise((resolve) => {
            const attachmentsObj = (item as any).attachments;
            if (attachmentsObj && typeof attachmentsObj.getAsync === 'function') {
                attachmentsObj.getAsync((result) => {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        resolve(result.value);
                    } else {
                        console.warn('Failed to get attachments in compose mode:', result.error);
                        resolve([]);
                    }
                });
            } else {
                resolve([]);
            }
        });
    };

    // 📄 Get body content (shared for both modes)
    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, async (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
            console.error('Failed to get body:', result.error);
            this.setState({ logged: 0 });
            return;
        }

        const bodyContent = result.value.split('<div id="x_appendonsend"></div>')[0];
        const msgFooter = `<br/><div class="text-muted font-italic">${_t('Logged from')} <a href="https://www.odoo.com/documentation/master/applications/productivity/mail_plugins.html" target="_blank">${_t('Outlook Inbox')}</a></div>`;

        // 🧠 Compose or Read mode header setup
        let fromHeader = '';
        if (isCompose) {
            // 🆕 Compose mode: show "To" addresses instead of "From"
            const toEmails = await getComposeRecipients();
            fromHeader = `<div>${_t('To : %(emails)s', { emails: toEmails.join(', ') })}</div>`;
        } else {
            // ✅ Read mode: use sender email
            fromHeader = `<div>${_t('From : %(email)s', {
                email: item.sender?.emailAddress || '[unknown]',
            })}</div>`;
        }

        const message = fromHeader + bodyContent + msgFooter;
        const doc = new DOMParser().parseFromString(message, 'text/html');

        // 📎 Attachment collection: supports Compose and Read
        const attachmentsRaw = isCompose
            ? await getComposeAttachments() // 🆕 Compose mode fetch
            : item.attachments || [];       // ✅ Read mode direct access

        // 📏 Thresholds
        const SIZE_THRESHOLD_TOTAL = 10; // MB
        const SIZE_THRESHOLD_SINGLE_ELEMENT = 5; // MB (not currently used, but defined)

        let totalSize = 0;
        attachmentsRaw.forEach((a) => (totalSize += a.size));

        const requestJson = {
            res_id: this.props.resId,
            model: this.props.model,
            message: '', // final HTML body
            attachments: [], // will be populated after processing
        };

        const promises = [];
        let attachments = [];
        let oversizeAttachments = [];
        let inlineAttachments = [];

        // 🧱 Check total attachment size before processing
        if (totalSize > SIZE_THRESHOLD_TOTAL * 1024 * 1024) {
            const warningMessage = _t(
                'Warning: Attachments could not be logged in Odoo because their total size exceeded the allowed maximum.'
            );
            doc.body.innerHTML += `<div class="text-danger">${warningMessage}</div>`;
        } else {
            attachmentsRaw.forEach((attachment, index) => {
                // 🛠️ Use existing logic to convert each attachment
                promises.push(this.fetchAttachmentContent(attachment, index));
            });
        }

        const results = await Promise.all(promises);

        // 🧹 Organize attachments into inline, oversize, or regular
        results.forEach((result) => {
            if (result.inline) {
                inlineAttachments[result.index] = result;
            } else if (result.oversize) {
                oversizeAttachments.push({ name: result.name });
            } else {
                attachments.push([result.name, result.content]);
            }
        });

        // 🖼️ Inline image handling
        const imageElements = doc.getElementsByTagName('img');
        let j = 0;
        inlineAttachments.forEach((inlineAttachment) => {
            if (inlineAttachment && !inlineAttachment.error) {
                if (inlineAttachment.oversize) {
                    imageElements[j].setAttribute(
                        'alt',
                        _t('Could not display image %(attachmentName)s, size is over limit', {
                            attachmentName: inlineAttachment.name,
                        })
                    );
                } else {
                    const fileExtension = inlineAttachment.name.split('.').pop();
                    imageElements[j].setAttribute(
                        'src',
                        `data:image/${fileExtension};base64, ${inlineAttachment.content}`
                    );
                }
                j++;
            }
        });

        // 🚨 Show oversize warning message
        if (oversizeAttachments.length > 0) {
            const names = oversizeAttachments.map((a) => `"${a.name}"`).join(', ');
            doc.body.innerHTML += `<div class="text-danger">${_t(
                'Warning: Could not fetch the attachments %(attachments)s as their sizes are bigger than the maximum size of %(size)sMB per each attachment.',
                {
                    attachments: names,
                    size: SIZE_THRESHOLD_TOTAL,
                }
            )}</div>`;
        }

        requestJson.message = doc.body.innerHTML;
        requestJson.attachments = attachments;

        console.log('===================== URL:', api.baseURL + api.logSingleMail);
        console.log('===================== Body:', requestJson);

        // 📨 Final log request to Odoo
        const logRequest = sendHttpRequest(
            HttpVerb.POST,
            api.baseURL + api.logSingleMail,
            ContentType.Json,
            this.context.getConnectionToken(),
            requestJson,
            true
        );

        // ✅ Handle log response
        logRequest.promise
            .then((response) => {
                const parsed = JSON.parse(response);
                if (parsed['error']) {
                    this.setState({ logged: 0 });
                    this.context.showHttpErrorMessage();
                } else {
                    this.setState({ logged: 2 });
                }
            })
            .catch((error) => {
                this.context.showHttpErrorMessage(error);
                this.setState({ logged: 0 });
            });
    });
};



//    private logRequest = async (event): Promise<any> => {
//        console.log('---------------------------logRequestsss')
//        const item = Office.context.mailbox.item;
//        const isCompose = typeof item.body.setAsync === 'function'; // Compose mode
//        console.log('--------iscompose', isCompose)
//        event.stopPropagation();

////        const item = Office.context.mailbox.item;
//        this.setState({ logged: 1 });
//        console.log('------------item', item)
//        console.log('-------------body', Office.context.mailbox.item.body)
//        Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, async (result) => {
//            const msgHeader = `<div>${_t('From : %(email)s', {
//                email: Office.context.mailbox.item.sender.emailAddress,
//            })}</div>`;
//            const msgFooter = `<br/><div class="text-muted font-italic">${_t(
//                'Logged from',
//            )} <a href="https://www.odoo.com/documentation/master/applications/productivity/mail_plugins.html" target="_blank">${_t(
//                'Outlook Inbox',
//            )}</a></div>`;
//            const body = result.value.split('<div id="x_appendonsend"></div>')[0]; // Remove the history and only log the most recent message.
//            const message = msgHeader + body + msgFooter;
//            const doc = new DOMParser().parseFromString(message, 'text/html');
//            const officeAttachmentDetails = Office.context.mailbox.item.attachments;
//            let totalSize = 0;
//            const promises: any[] = [];
//            const requestJson = {
//                res_id: this.props.resId,
//                model: this.props.model,
//                message: message,
//                attachments: [],
//            };

//            //check if attachment size is bigger then the threshold
//            officeAttachmentDetails.forEach((officeAttachment) => {
//                totalSize += officeAttachment.size;
//            });

//            if (totalSize > SIZE_THRESHOLD_TOTAL * 1024 * 1024) {
//                const warningMessage = _t(
//                    'Warning: Attachments could not be logged in Odoo because their total size' +
//                        ' exceeded the allowed maximum.',
//                    {
//                        size: SIZE_THRESHOLD_SINGLE_ELEMENT,
//                    },
//                );
//                doc.body.innerHTML += `<div class="text-danger">${warningMessage}</div>`;
//            } else {
//                officeAttachmentDetails.forEach((attachment, index) => {
//                    promises.push(this.fetchAttachmentContent(attachment, index));
//                });
//            }

//            const results = await Promise.all(promises);

//            let attachments = [];
//            let oversizeAttachments = [];
//            let inlineAttachments = [];

//            results.forEach((result) => {
//                if (result.inline) {
//                    inlineAttachments[result.index] = result;
//                } else {
//                    if (result.oversize) {
//                        oversizeAttachments.push({
//                            name: result.name,
//                        });
//                    } else {
//                        attachments.push([result.name, result.content]);
//                    }
//                }
//            });
//            // a counter is needed to map img tags with attachments, as outlook does not provide
//            // an id that enables us to match an img with an attachment.
//            let j = 0;
//            const imageElements = doc.getElementsByTagName('img');

//            inlineAttachments.forEach((inlineAttachment) => {
//                if (inlineAttachment != null && inlineAttachment.error == undefined) {
//                    if (inlineAttachment.oversize) {
//                        imageElements[j].setAttribute(
//                            'alt',
//                            _t('Could not display image %(attachmentName)s, size is over limit', {
//                                attachmentName: inlineAttachment.name,
//                            }),
//                        );
//                    } else {
//                        const fileExtension = inlineAttachment.name.split('.')[1];
//                        imageElements[j].setAttribute(
//                            'src',
//                            `data:image/${fileExtension};base64, ${inlineAttachment.content}`,
//                        );
//                    }
//                    j++;
//                }
//            });

//            if (oversizeAttachments.length > 0) {
//                const attachmentNames = oversizeAttachments.map((attachment) => `"${attachment.name}"`).join(', ');
//                const warningMessage = _t(
//                    'Warning: Could not fetch the attachments %(attachments)s as their sizes are bigger then the maximum size of %(size)sMB per each attachment.',
//                    {
//                        attachments: attachmentNames,
//                        size: SIZE_THRESHOLD_TOTAL,
//                    },
//                );
//                doc.body.innerHTML += `<div class="text-danger">${warningMessage}</div>`;
//            }

//            requestJson.message = doc.body.innerHTML;
//            requestJson.attachments = attachments;
//            console.log('=====================url', api.baseURL + api.logSingleMail)
//            console.log('=====================bosy', requestJson)
//            const logRequest = sendHttpRequest(
//                HttpVerb.POST,
//                api.baseURL + api.logSingleMail,
//                ContentType.Json,
//                this.context.getConnectionToken(),
//                requestJson,
//                true,
//            );
//            logRequest.promise
//                .then((response) => {
//                    const parsed = JSON.parse(response);
//                    if (parsed['error']) {
//                        this.setState({ logged: 0 });
//                        this.context.showHttpErrorMessage();
//                        return;
//                    } else {
//                        this.setState({ logged: 2 });
//                    }
//                })
//                .catch((error) => {
//                    this.context.showHttpErrorMessage(error);
//                    this.setState({ logged: 0 });
//                });
//        });
//    };


//private logRequest = async (event): Promise<any> => {
//    console.log('---------------------------logRequestsss');
//    event.stopPropagation();

//    this.setState({ logged: 1 });
//    
//    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, async (result) => {
//        const item = Office.context.mailbox.item;
//        let senderEmail = '';
//        const isCompose = typeof item.from?.getAsync === 'function';

//        if (isCompose) {
//            // In Compose mode, get the first recipient instead
//            await new Promise<void>((resolve) => {
//                item.to.getAsync((res) => {
//                    if (res.status === Office.AsyncResultStatus.Succeeded && res.value.length > 0) {
//                        senderEmail = res.value[0].emailAddress || '';
//                    }
//                    resolve();
//                });
//            });
//        } else {
//            const from = item.from;
//            const userEmail = Office.context.mailbox.userProfile.emailAddress;
//            senderEmail = from?.emailAddress || '';

//            if (userEmail === senderEmail && item.to?.length > 0) {
//                senderEmail = item.to[0].emailAddress;
//            }
//        }

//        const msgHeader = `<div>${_t('From : %(email)s', { email: senderEmail })}</div>`;
//        const msgFooter = `<br/><div class="text-muted font-italic">${_t(
//            'Logged from',
//        )} <a href="https://www.odoo.com/documentation/master/applications/productivity/mail_plugins.html" target="_blank">${_t(
//            'Outlook Inbox',
//        )}</a></div>`;
//        
//        const body = result.value.split('<div id="x_appendonsend"></div>')[0];
//        const message = msgHeader + body + msgFooter;
//        const doc = new DOMParser().parseFromString(message, 'text/html');

//        const officeAttachmentDetails = Office.context.mailbox.item.attachments;
//        let totalSize = 0;
//        const promises: any[] = [];
//        const requestJson = {
//            res_id: this.props.resId,
//            model: this.props.model,
//            message: message,
//            attachments: [],
//        };

//        officeAttachmentDetails.forEach((officeAttachment) => {
//            totalSize += officeAttachment.size;
//        });

//        if (totalSize > SIZE_THRESHOLD_TOTAL * 1024 * 1024) {
//            const warningMessage = _t(
//                'Warning: Attachments could not be logged in Odoo because their total size exceeded the allowed maximum.',
//                { size: SIZE_THRESHOLD_SINGLE_ELEMENT },
//            );
//            doc.body.innerHTML += `<div class="text-danger">${warningMessage}</div>`;
//        } else {
//            officeAttachmentDetails.forEach((attachment, index) => {
//                promises.push(this.fetchAttachmentContent(attachment, index));
//            });
//        }

//        const results = await Promise.all(promises);

//        let attachments = [];
//        let oversizeAttachments = [];
//        let inlineAttachments = [];

//        results.forEach((result) => {
//            if (result.inline) {
//                inlineAttachments[result.index] = result;
//            } else {
//                if (result.oversize) {
//                    oversizeAttachments.push({ name: result.name });
//                } else {
//                    attachments.push([result.name, result.content]);
//                }
//            }
//        });

//        let j = 0;
//        const imageElements = doc.getElementsByTagName('img');
//        inlineAttachments.forEach((inlineAttachment) => {
//            if (inlineAttachment && inlineAttachment.error === undefined) {
//                if (inlineAttachment.oversize) {
//                    imageElements[j].setAttribute(
//                        'alt',
//                        _t('Could not display image %(attachmentName)s, size is over limit', {
//                            attachmentName: inlineAttachment.name,
//                        }),
//                    );
//                } else {
//                    const fileExtension = inlineAttachment.name.split('.').pop();
//                    imageElements[j].setAttribute(
//                        'src',
//                        `data:image/${fileExtension};base64, ${inlineAttachment.content}`,
//                    );
//                }
//                j++;
//            }
//        });

//        if (oversizeAttachments.length > 0) {
//            const attachmentNames = oversizeAttachments.map((att) => `"${att.name}"`).join(', ');
//            const warningMessage = _t(
//                'Warning: Could not fetch the attachments %(attachments)s as their sizes are bigger than the maximum size of %(size)sMB per each attachment.',
//                {
//                    attachments: attachmentNames,
//                    size: SIZE_THRESHOLD_TOTAL,
//                },
//            );
//            doc.body.innerHTML += `<div class="text-danger">${warningMessage}</div>`;
//        }

//        requestJson.message = doc.body.innerHTML;
//        requestJson.attachments = attachments;

//        console.log('=====================url', api.baseURL + api.logSingleMail);
//        console.log('=====================body', requestJson);

//        const logRequest = sendHttpRequest(
//            HttpVerb.POST,
//            api.baseURL + api.logSingleMail,
//            ContentType.Json,
//            this.context.getConnectionToken(),
//            requestJson,
//            true,
//        );

//        logRequest.promise
//            .then((response) => {
//                const parsed = JSON.parse(response);
//                if (parsed['error']) {
//                    this.setState({ logged: 0 });
//                    this.context.showHttpErrorMessage();
//                } else {
//                    this.setState({ logged: 2 });
//                }
//            })
//            .catch((error) => {
//                this.context.showHttpErrorMessage(error);
//                this.setState({ logged: 0 });
//            });
//    });
//};


    render() {
        let logContainer = null;
        switch (this.state.logged) {
            case 0:
                logContainer = (
                    <div className="log-container">
                        <TooltipHost content={this.props.tooltipContent}>
                            <div className="odoo-secondary-button log-button" onClick={this.logRequest}>
                                <FontAwesomeIcon icon={faEnvelope} />
                            </div>
                        </TooltipHost>
                    </div>
                );
                break;
            case 1:
                logContainer = (
                    <div className="log-container">
                        <div>
                            <Spinner theme={OdooTheme} size={SpinnerSize.medium} />
                        </div>
                    </div>
                );
                break;
            case 2:
                logContainer = (
                    <div className="log-container">
                        <div className="logged-text">
                            <FontAwesomeIcon icon={faCheck} color={'green'} />
                        </div>
                    </div>
                );
                break;
        }

        return <>{logContainer}</>;
    }
}

Logger.contextType = AppContext;

export default Logger;
