import * as React from 'react';
import Partner from '../../../classes/Partner';

import AppContext from '../AppContext';
import api from '../../api';
import Lead from '../../../classes/Lead';
import Section from '../Section/Section';
import SelectLeadDropdown from './SelectLeadDropdown';
import { _t } from '../../../utils/Translator';
import { Callout, DirectionalHint } from 'office-ui-fabric-react';


type LeadSectionProps = {
    partner: Partner;
    canCreatePartner: boolean;
    canCreateLead: boolean;
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
        this.state = {
            leads: this.props.partner.leads,
//            isCollapsed: isCollapsed,
            isLeadCalloutOpen: false,
         };
    }

    private toggleLeadCallout = (callback) => {
        console.log('SECTIONLEAD-toggleLeadCallout', this.state.isLeadCalloutOpen)
        this.setState({
            isLeadCalloutOpen: !this.state.isLeadCalloutOpen,
            createCallback: callback,
        });
    };

    private onLeadSelected = (Lead: Lead) => {
        console.log('SECTIONLEAD-onLeadSelected', this.state.isLeadCalloutOpen)
        this.setState({ isLeadCalloutOpen: false });
        this.state.createCallback({ lead_id: lead.id });
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
                        />
                    </Callout>
                )}
            </>
        );
    }
}

SectionLeads.contextType = AppContext;

export default SectionLeads;
