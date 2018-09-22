/** @format */
/**
 * External dependencies
 */
import PropTypes from 'prop-types';
import { localize } from 'i18n-calypso';
import React from 'react';
import { flow, flowRight } from 'lodash';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import Button from 'components/forms/form-button';
import { createStartImportAction } from 'lib/importer/actions';
import { connectDispatcher } from 'my-sites/importer/dispatcher-converter';
import { recordTracksEvent } from 'state/analytics/actions';

class StartButton extends React.PureComponent {
	static displayName = 'StartButton';

	static propTypes = {
		importerStatus: PropTypes.shape( {
			type: PropTypes.string.isRequired,
		} ),
		site: PropTypes.shape( {
			ID: PropTypes.number.isRequired,
		} ),
	};

	handleClick = () => {
		const {
			importerStatus: { type },
			site: { ID: siteId },
			startImport,
		} = this.props;
		const tracksType = type.endsWith( 'site-importer' ) ? type + '-wix' : type;

		startImport( siteId, type );

		this.props.recordTracksEvent( 'calypso_importer_main_start_clicked', {
			blog_id: siteId,
			importer_id: tracksType,
		} );
	};

	render() {
		const { translate } = this.props;

		return (
			<Button className="importer-header__action-button" isPrimary onClick={ this.handleClick }>
				{ translate( 'Start Import', { context: 'verb' } ) }
			</Button>
		);
	}
}

const mapDispatchToProps = dispatch => ( {
	startImport: flowRight(
		dispatch,
		createStartImportAction
	),
} );

export default flow(
	connect(
		null,
		{ recordTracksEvent }
	),
	connectDispatcher( null, mapDispatchToProps ),
	localize
)( StartButton );
