console.log('---SECTIONLEADDROPDOWN----')
import { Spinner, SpinnerSize, TextField } from 'office-ui-fabric-react';
import * as React from 'react';
import Partner from '../../../classes/Partner';
import Lead from '../../../classes/Lead';
import { ContentType, HttpVerb, sendHttpRequest } from '../../../utils/httpRequest';
import { OdooTheme } from '../../../utils/Themes';
import { _t } from '../../../utils/Translator';
import api from '../../api';
import './SelectLeadDropdown.css';
import AppContext from '../AppContext';

type SelectLeadProps = {
    partner: Partner;
    canCreateLead: boolean;
    onLeadClick: (Lead: Lead) => void;
    opportunityLeads: Lead[];
};

type SelectLeadState = {
    query: string;
    isLoading: boolean;
    Leads: Lead[];
};

class SelectLeadDropdown extends React.Component<SelectLeadProps, SelectLeadState> {
    constructor(props, context) {
        super(props, context);
        this.state = { query: '', isLoading: false, Leads: [] };
    }

    private LeadsRequest;

    private onQueryChanged = (event) => {
        const query = event.target.value;
        this.setState({ query: query });
        this.cancelLeadsRequest();
        if (query.length > 0) {
            this.getLeadsRequest(query);
        } else {
            this.setState({ isLoading: false, Leads: [] });
        }
    };

    private cancelLeadsRequest = () => {
        if (this.LeadsRequest) this.LeadsRequest.cancel();
    };

    private getLeadsRequest = async (searchTerm: string) => {
        const { opportunityLeads } = this.props;
        const existingLeadIds = opportunityLeads.map(lead => lead.id);  
        if (!searchTerm || !searchTerm.length) {
            return;
        }

        this.setState({ isLoading: true });
        this.LeadsRequest = sendHttpRequest(
            HttpVerb.POST,
            api.baseURL + api.searchLead,
            ContentType.Json,
            this.context.getConnectionToken(),
            { search_term: searchTerm },
//            {
//                partner_id: this.props.partner.id,
//                email_body: message,
//                email_subject: subject,
//                email_address: this.props.partner.email,
//            },
            true,
        );
        this.context.addRequestCanceller(this.LeadsRequest.cancel);

        let response = null;
        try {
            response = JSON.parse(await this.LeadsRequest.promise);
        } catch (error) {
            if (error) {
                this.setState({ isLoading: false, Leads: [] });
                this.context.showHttpErrorMessage(error);
            }
            return;
        }
        const allLeads = response.result;
        const filteredLeads = allLeads.filter(lead => {
            const isExisting = existingLeadIds.includes(lead.lead_id);  // Use lead.lead_id instead of lead.id
            return !isExisting;
        });
//        const Leads = response.result.map((Lead_json) => Lead.fromJSON(Lead_json));
        this.setState({ Leads: filteredLeads, isLoading: false });
    };

//    private createLead = async () => {
//        console.log('LEADDROPDOWN-createLead');

//        this.setState({ isLoading: true });

//        Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, async (result) => {
//            const message = result.value.split('<div id="x_appendonsend"></div>')[0];
//            const emailAddress = Office.context.mailbox.item.to[0]?.emailAddress || '';

//            const requestJson = {
//                email_body: message,
//                email_subject: this.state.query,
//                email_address: emailAddress,
//                partner_id: this.props.partner?.isAddedToDatabase() ? this.props.partner.id : false,
//            };

//            console.log('requestJson', requestJson);

//            try {
//                const response = await sendHttpRequest(
//                    HttpVerb.POST,
//                    api.baseURL + api.createLead,
//                    ContentType.Json,
//                    this.context.getConnectionToken(),
//                    requestJson,
//                    true
//                ).promise;

//                console.log('Lead created successfully:', response);

//                if (response.error) {
//                    this.context.showTopBarMessage();
//                    this.setState({ isLoading: false });
//                    return;
//               }
//                console.log('hhhhhhhhhhhhhhhhh', response.result)
////                const createdLead = Lead.fromJSON(response.result);
////                const recordId = response.result.lead_id;

//                // Optional: Notify parent
////                this.props.onLeadClick(createdLead);

//                // Redirect to Odoo Lead Form View
////                const cids = this.context.getUserCompaniesString?.() || '';
////                const url = `${api.baseURL}/web#action=crm_mail_plugin.crm_lead_action_form_edit&id=${recordId}&model=crm.lead&view_type=form${cids}`;
////                console.log('Redirecting to:', url);
////                window.open(url, '_blank');

//                this.setState({ isLoading: false });

//            } catch (error) {
//                console.error('Lead creation error:', error);
//                this.context.showHttpErrorMessage(error);
//                this.setState({ isLoading: false });
//            }
//        });
//    };

    private createLead = (additionnalValues?) => {
        console.log('=======================================LEAD')
        Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, async (result) => {
            // Remove the history and only log the most recent message.
            const message = result.value.split('<div id="x_appendonsend"></div>')[0];
//            const subject = Office.context.mailbox.item.subject;

            const requestJson = Object.assign(
                
                {
                    partner_id: this.props.partner.id,
                    email_body: message,
                    email_subject: this.state.query,
                    email_address: this.props.partner.email,
                },
                additionnalValues || {},
            );

            let response = null;
            try {
                response = await sendHttpRequest(
                    HttpVerb.POST,
                    api.baseURL + api.createLead,
                    ContentType.Json,
                    this.context.getConnectionToken(),
                    requestJson,
                    true,
                ).promise;
            } catch (error) {
                this.context.showHttpErrorMessage(error);
                return;
            }
            const parsed = JSON.parse(response);
            if (parsed['error']) {
                this.context.showTopBarMessage();
                return;
            }
            const cids = this.context.getUserCompaniesString();
            console.log('llllll', parsed.result)
            const recordId = parsed.result.lead_id;
            const url = `${api.baseURL}/web#action=crm_mail_plugin.crm_lead_action_form_edit&id=${recordId}&model=crm.lead&view_type=form${cids}`;
            window.open(url);
        });
    };

//    private createLead = async () => {
//        console.log('LEADDROPDOWN-createLead', api.baseURL + api.createLead)
//        const createLeadRequest = sendHttpRequest(
//            HttpVerb.POST,
//            api.baseURL + api.createLead,
//            ContentType.Json,
//            this.context.getConnectionToken(),
//            { name: this.state.query },
//            true,
//        );

//        this.setState({ isLoading: true });

//        let response = null;
//        try {
//            response = JSON.parse(await createLeadRequest.promise);
//        } catch (error) {
//            if (error) {
//                this.setState({ isLoading: false, Leads: [] });
//                this.context.showHttpErrorMessage(error);
//                this.setState({ isLoading: false });
//            }
//            return;
//        }

//        const createdLead = Lead.fromJSON(response.result);
//        this.props.onLeadClick(createdLead);
//    };

    private getLeads = () => {
        const searchedTermExists = this.state.Leads.filter(
            (p) => p.name.toUpperCase() === this.state.query.toUpperCase(),
        ).length;

        const allowCreateNewLead = this.props.canCreateLead && !!this.state.query.length && !searchedTermExists;

        return (
            <div>
                {this.state.Leads.map((Lead) => (
                    <div
                        key={Lead.id}
                        className="Lead-search-result-text"
                        onClick={() => this.props.onLeadClick(Lead)}>
                        {Lead.name}
                    </div>
                ))}
                {allowCreateNewLead && (
                    <div className="create-Lead-text" onClick={this.createLead}>
                        {_t('Create %(name)s', { name: this.state.query })}
                    </div>
                )}
                {this.state.query.length && !allowCreateNewLead && !this.state.Leads.length ? (
                    <div>{_t('No Lead Found')}</div>
                ) : null}
                {this.state.isLoading && (
                    <Spinner theme={OdooTheme} size={SpinnerSize.large} className="Lead-result-spinner" />
                )}
            </div>
        );
    };

    render() {
        return (
            <div className="Lead-result-container">
                <div>{_t('Pick a Lead')}</div>
                <div className="Lead-search-bar">
                    <TextField
                        className="input-search"
                        placeholder={_t('Search Leads...')}
                        onChange={this.onQueryChanged}
                        value={this.state.query}
                        autoComplete="off"
                        onFocus={(e) => e.target.select()}
                    />
                </div>
                {this.getLeads()}
            </div>
        );
    }
}

SelectLeadDropdown.contextType = AppContext;
export default SelectLeadDropdown;
