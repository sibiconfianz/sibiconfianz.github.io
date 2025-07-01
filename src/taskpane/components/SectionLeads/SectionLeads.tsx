import * as React from 'react';
import Partner from '../../../classes/Partner';

import AppContext from '../AppContext';
import api from '../../api';
import Lead from '../../../classes/Lead';
import Section from '../Section/Section';
import SelectLeadDropdown from './SelectLeadDropdown';
import { _t } from '../../../utils/Translator';
import { Callout, DirectionalHint } from 'office-ui-fabric-react';
import { ContentType, HttpVerb, sendHttpRequest } from '../../../utils/httpRequest';


type LeadSectionProps = {
    partner: Partner;
    canCreatePartner: boolean;
    canCreateLead: boolean;
//    exstingLeads: [];
    opportunityLeads: Lead[];  // Add this property to the type

};

type SectionLeadsState = {
    leads: Lead[];
    isCollapsed: boolean; //new
    isLeadCalloutOpen: boolean; //new
    createCallback?: (any?) => {}; //new
};

class SectionLeads extends React.Component<LeadSectionProps, SectionLeadsState> {
    constructor(props, context) {
        super(props, context);
        const isCollapsed = !props.partner.leads || !props.partner.leads.length;
        this.state = {
            leads: this.props.partner.leads,
            isCollapsed: isCollapsed,
            isLeadCalloutOpen: false,
         };
    }

    private toggleLeadCallout = (callback) => {
        this.setState({
            isLeadCalloutOpen: !this.state.isLeadCalloutOpen,
            createCallback: callback,
        });
    };

//    private onLeadSelected = (lead: Lead) => {
//        console.log('onLeadSelected--------------LEAD', lead)
//        this.setState({ isLeadCalloutOpen: false });
//        this.state.createCallback({ lead_id: lead.id });
//    };

//    private onLeadSelected = (lead: Lead) => {
//        console.log('onLeadSelected--------------1LEAD', lead);
//        console.log('Section', Section)

//        // Close the callout
//        this.setState({ isLeadCalloutOpen: false });

//        // Prevent duplicates
//        const alreadyExists = this.state.leads.some(existing => existing.id === lead.id);
//        console.log('sssssssss', alreadyExists)
//        console.log('Section', Section)
//        if (alreadyExists) {
//            console.log('Lead already in the list, skipping.');
//            return;
//        }
//        // Add the lead to the current leads in UI only
//        this.setState(prevState => ({
//            leads: [...prevState.leads, lead],
//        }));
//    };

    private onLeadSelected = async (lead: any) => {

        const normalizedLead: Lead = {
            ...lead,
            id: lead.id || lead.lead_id,
        };

        this.setState({ isLeadCalloutOpen: false });

        const updateData = {
            partner_id: this.props.partner.id,  // even if it's -1
            email_from: Office.context.mailbox.item.to[0].emailAddress,
        };
        const updateRequest = sendHttpRequest(
            HttpVerb.POST,
            api.baseURL + api.odooEndpointUpdateLead,
            ContentType.Json,
            this.context.getConnectionToken(),
            {
                lead_id: normalizedLead.id,
                values: updateData,
            },
            true
        );

        try {
            const response = JSON.parse(await updateRequest.promise);
        } catch (error) {
            this.context.showHttpErrorMessage(error);
            return;
        }

        const alreadyExists = this.state.leads.some(existing => existing.id === normalizedLead.id);
        if (alreadyExists) {
            return;
        }

        this.setState(prevState => ({
            leads: [...prevState.leads, normalizedLead],
        }));
    };

    private getLeadDescription = (lead: Lead): string => {
        const expectedRevenueString = _t(
            lead.recurringPlan
                ? '%(expected_revenue)s + %(recurring_revenue)s %(recurring_plan)s at %(probability)s%'
                : '%(expected_revenue)s at %(probability)s%',
            {
                expected_revenue: lead.expectedRevenue,
                recurring_revenue: lead.recurringRevenue,
                recurring_plan: lead.recurringPlan,
                probability: lead.probability,
            },
        );

        return expectedRevenueString;
    };

    render() {
        return (
        <>
            <Section
                className="collapse-lead-section"
                records={this.state.leads}
                partner={this.props.partner}
                canCreatePartner={this.props.canCreatePartner}
                model="crm.lead"
                odooEndpointCreateRecord={api.createLead}
                odooRecordIdName="lead_id"
                odooRedirectAction="crm_mail_plugin.crm_lead_action_form_edit"
                title="Opportunities"
                titleCount="Opportunities (%(count)s)"
                msgNoPartner="Save Contact to create new Opportunities."
                msgNoPartnerNoAccess="The Contact needs to exist to create Opportunity."
                msgNoRecord="No opportunities found for this contact."
                msgLogEmail="Log Email Into Lead"
                getRecordDescription={this.getLeadDescription}
                onClickCreate={this.toggleLeadCallout}
            />
                {this.state.isLeadCalloutOpen && (
                    <Callout
                        directionalHint={DirectionalHint.bottomRightEdge}
                        directionalHintFixed={true}
                        onDismiss={() => this.setState({ isLeadCalloutOpen: false })}
                        preventDismissOnScroll={true}
                        setInitialFocus={true}
                        doNotLayer={true}
                        gapSpace={0}
                        role="alertdialog"
                        target=".collapse-lead-section .collapse-section-button">
                        <SelectLeadDropdown
                            partner={this.props.partner}
                            canCreateLead={this.props.canCreateLead}
                            onLeadClick={this.onLeadSelected}
                            opportunityLeads={this.props.opportunityLeads}   // Pass the already linked leads
                        />
                    </Callout>
                )}
            </>
        );
    }
}

SectionLeads.contextType = AppContext;

export default SectionLeads;
