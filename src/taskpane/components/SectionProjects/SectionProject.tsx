import * as React from 'react';
import Partner from '../../../classes/Partner';

import AppContext from '../AppContext';
import api from '../../api';
import Project from '../../../classes/Project';
import Section from '../Section/Section';

import { _t } from '../../../utils/Translator';

type ProjectSectionProps = {
    partner: Partner;
    canCreatePartner: boolean;
};

type SectionProjectOrdersState = {
    projects: Project[];
};

class SectionProjects extends React.Component<ProjectSectionProps, SectionProjectsState> {
    constructor(props, context) {
        super(props, context);
        this.state = { projects: this.props.partner.projects || [] };
    }

//    private getProjectDescription = (prj: Project): string => {
//        return `${prj.amountTotal}`.trim();
//    };

    render() {
        return (
            <Section
                records={this.state.projects}
                partner={this.props.partner}
                canCreatePartner={this.props.canCreatePartner}
                model="project.project"
                odooEndpointCreateRecord={api.createLead} //TODO
                odooRecordIdName="project_id"
                odooRedirectAction="sale.sale_order_action" //TODO
                title="Projects"
                titleCount="Projects (%(count)s)"
                msgNoPartner="Save Contact to create new Projects."
                msgNoPartnerNoAccess="The Contact needs to exist to create Projects."
                msgNoRecord="No Projects found for this contact."
                msgLogEmail="Log Email Into Project"
                getRecordDescription={this.getProjectDescription}
            />
        );
    }
}

SectionProjects.contextType = AppContext;

export default SectionProjects;

