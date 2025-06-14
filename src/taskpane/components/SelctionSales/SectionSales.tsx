import * as React from 'react';
import Partner from '../../../classes/Partner';

import AppContext from '../AppContext';
import api from '../../api';
import SaleOrder from '../../../classes/SaleOrder';
import Section from '../Section/Section';

import { _t } from '../../../utils/Translator';

type SaleOrderSectionProps = {
    partner: Partner;
    canCreatePartner: boolean;
};

type SectionSaleOrdersState = {
    sales: SaleOrder[];
};

class SectionSaleOrders extends React.Component<SaleOrderSectionProps, SectionSaleOrdersState> {
    constructor(props, context) {
        super(props, context);
        this.state = { sales: this.props.partner.sales || [] };
    }

    private getSaleOrderDescription = (order: SaleOrder): string => {
        const linkTypeLabel = {
            direct: '',
            child: '[Child Contact]',
            parent: '[Parent Contact]',
        }[order.linkType];

        return `${order.amountTotal} ${linkTypeLabel || ''}`.trim();
    };

    render() {
        return (
            <Section
                records={this.state.sales}
                partner={this.props.partner}
                canCreatePartner={this.props.canCreatePartner}
                model="sale.order"
                odooEndpointCreateRecord={api.createSaleOrder}
                odooRecordIdName="order_id"
                odooRedirectAction="sale.sale_order_action"
                title="Sales Orders"
                titleCount="Sales Orders (%(count)s)"
                msgNoPartner="Save Contact to create new Sales Order."
                msgNoPartnerNoAccess="The Contact needs to exist to create Sales Order."
                msgNoRecord="No Sales Orders found for this contact."
                msgLogEmail="Log Email Into Sale Order"
                getRecordDescription={this.getSaleOrderDescription}
            />
        );
    }
}

SectionSaleOrders.contextType = AppContext;

export default SectionSaleOrders;

