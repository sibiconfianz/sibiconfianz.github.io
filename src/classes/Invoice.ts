class Invoice {
    id: number;
    name: string;
    amountTotal: string; // formatted amount

    static fromJSON(o: Object): Invoice {
        const inv = new Invoice();
        inv.id = o['inv_id'];
        inv.name = o['name'];
        inv.amountTotal = o['amount_total'];
        return so;
    }

    static copy(inv: Invoice): Invoice {
        const newSo = new Invoice();
        newInv.id = inv.id;
        newInv.name = inv.name;
        newInv.amountTotal = inv.amountTotal;
        return newInv;
    }

//    private static removeDecimals(amount: string): string {
//        if (amount.search(/\.00\D*$/) != -1) {
//            return amount.replace(/\.00/, '');
//        } else if (amount.search(/,00\D*$/) != -1) {
//            return amount.replace(/,00/, '');
//        }
//        return amount;
//    }
}

export default Invoice;
