class SaleOrder {
    id: number;
    name: string;
    amountTotal: string; // formatted amount
    state: string;
    dateOrder: string;
    linkType?: 'direct' | 'child' | 'parent'; // optional metadata like lead

    static fromJSON(o: Object): SaleOrder {
        const so = new SaleOrder();
        so.id = o['order_id'];
        so.name = o['name'];
        so.amountTotal = this.removeDecimals(o['amount_total']);
        so.state = o['state'];
        so.dateOrder = o['date_order'];
        so.linkType = o['link_type']; // direct, child, parent
        return so;
    }

    static copy(so: SaleOrder): SaleOrder {
        const newSo = new SaleOrder();
        newSo.id = so.id;
        newSo.name = so.name;
        newSo.amountTotal = so.amountTotal;
        newSo.state = so.state;
        newSo.dateOrder = so.dateOrder;
        return newSo;
    }

    private static removeDecimals(amount: string): string {
        if (amount.search(/\.00\D*$/) != -1) {
            return amount.replace(/\.00/, '');
        } else if (amount.search(/,00\D*$/) != -1) {
            return amount.replace(/,00/, '');
        }
        return amount;
    }
}

export default SaleOrder;

