console.log('---------------------------------INVOICESECTION')
import * as React from 'react';
import Partner from '../../../classes/Partner';

import AppContext from '../AppContext';
import api from '../../api';
import Invoice from '../../../classes/Invoice';
import Section from '../Section/Section';

import { _t } from '../../../utils/Translator';

type InvoiceSectionProps = {
    partner: Partner;
    canCreatePartner: boolean;
};

type SectionInvoicesState = {
    invoices: Invoice[];
};

class SectionInvoices extends React.Component<InvoiceSectionProps, SectionInvoicesState> {
    constructor(props, context) {
        super(props, context);
        this.state = { invoices: this.props.partner.invoices || [] };
    }

    private getInvoiceDescription = (inv: Invoice): string => {
        return `${inv.amountTotal}`.trim();
    };

    render() {
        return (
            <Section
                records={this.state.invoices}
                partner={this.props.partner}
                canCreatePartner={this.props.canCreatePartner}
                model="account.move"
                odooEndpointCreateRecord={api.createLead} //TODO
                odooRecordIdName="inv_id"
                odooRedirectAction="account.sale_order_action" //TODO
                title="Invoices"
                titleCount="Invoices (%(count)s)"
                msgNoPartner="Save Contact to create new Invoice."
                msgNoPartnerNoAccess="The Contact needs to exist to create Invoice."
                msgNoRecord="No Invoice found for this contact."
                msgLogEmail="Log Email Into Invoice"
                getRecordDescription={this.getInvoiceDescription}
            />
        );
    }
}

SectionInvoices.contextType = AppContext;

export default SectionInvoices;

