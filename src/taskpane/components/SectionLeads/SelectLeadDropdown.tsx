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
        const Leads = response.result.map((Lead_json) => Lead.fromJSON(Lead_json));
        this.setState({ Leads: Leads, isLoading: false });
    };

    private createLead = async () => {
        const createLeadRequest = sendHttpRequest(
            HttpVerb.POST,
            api.baseURL + api.createLead,
            ContentType.Json,
            this.context.getConnectionToken(),
            { name: this.state.query },
            true,
        );

        this.setState({ isLoading: true });

        let response = null;
        try {
            response = JSON.parse(await createLeadRequest.promise);
        } catch (error) {
            if (error) {
                this.setState({ isLoading: false, Leads: [] });
                this.context.showHttpErrorMessage(error);
                this.setState({ isLoading: false });
            }
            return;
        }

        const createdLead = Lead.fromJSON(response.result);
        this.props.onLeadClick(createdLead);
    };

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
