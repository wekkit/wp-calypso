/** @format */
/**
 * External dependencies
 */
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';
import classNames from 'classnames';
import debugFactory from 'debug';
import { first, includes, indexOf, intersection, isEqual, last, map } from 'lodash';

/**
 * Internal dependencies
 */
import QueryContactDetailsCache from 'components/data/query-contact-details-cache';
import QueryTldValidationSchemas from 'components/data/query-tld-validation-schemas';
import PaymentBox from './payment-box';
import FormButton from 'components/forms/form-button';
import SecurePaymentFormPlaceholder from './secure-payment-form-placeholder.jsx';
import wp from 'lib/wp';
import config from 'config';
import BillingDetailsFormFields from './billing-details-form-fields';
import ExtraInfoForm, {
	tldsWithAdditionalDetailsForms,
} from 'components/domains/registrant-extra-info';
import { setDomainDetails, addGoogleAppsRegistrationData } from 'lib/upgrades/actions';
import { cartItems } from 'lib/cart-values';
import getContactDetailsCache from 'state/selectors/get-contact-details-cache';
import { updateContactDetailsCache } from 'state/domains/management/actions';
import { recordTracksEvent } from 'state/analytics/actions';

const debug = debugFactory( 'calypso:my-sites:upgrades:checkout:domain-details' );
const wpcom = wp.undocumented();

export class BillingDetailsForm extends PureComponent {
	constructor( props ) {
		super( props );
		const steps = [ 'mainForm', ...this.getTldsWithAdditionalForm() ];
		debug( 'steps:', steps );
		this.state = {
			steps,
			currentStep: first( steps ),
		};
	}

	componentDidMount() {
		if ( this.props.recordTracksEvent ) {
			this.props.recordTracksEvent( 'calypso_checkout_domain_contact_information_view' );
		}
	}

	componentDidUpdate( prevProps ) {
		if ( ! isEqual( prevProps.cart, this.props.cart ) ) {
			this.validateSteps();
		}
	}

	validateSteps() {
		const updatedSteps = [ 'mainForm', ...this.getTldsWithAdditionalForm() ];
		const newState = {
			steps: updatedSteps,
		};
		if ( updatedSteps.indexOf( this.state.currentStep ) < 0 ) {
			debug( 'Switching to step: mainForm' );
			newState.currentStep = 'mainForm';
		}
		this.setState( newState );
	}

	validate = ( fieldValues, onComplete ) => {
		const validationHandler = ( error, data ) => {
			const messages = ( data && data.messages ) || {};
			onComplete( error, messages );
		};

		if ( this.needsOnlyGoogleAppsDetails() ) {
			wpcom.validateGoogleAppsContactInformation( fieldValues, validationHandler );
			return;
		}

		wpcom.validateDomainContactInformation( fieldValues, this.getDomainNames(), validationHandler );
	};

	hasAnotherStep() {
		return this.state.currentStep !== last( this.state.steps );
	}

	switchToNextStep() {
		const newStep = this.state.steps[ indexOf( this.state.steps, this.state.currentStep ) + 1 ];
		debug( 'Switching to step: ' + newStep );
		this.setState( { currentStep: newStep } );
	}

	needsDomainDetails() {
		const cart = this.props.cart;

		if ( cart && cartItems.hasOnlyRenewalItems( cart ) ) {
			return false;
		}

		return (
			cart &&
			( cartItems.hasDomainRegistration( cart ) ||
				cartItems.hasGoogleApps( cart ) ||
				cartItems.hasTransferProduct( cart ) )
		);
	}

	getDomainNames = () =>
		map(
			[
				...cartItems.getDomainRegistrations( this.props.cart ),
				...cartItems.getDomainTransfers( this.props.cart ),
			],
			'meta'
		);

	needsOnlyGoogleAppsDetails() {
		return (
			cartItems.hasGoogleApps( this.props.cart ) &&
			! cartItems.hasDomainRegistration( this.props.cart ) &&
			! cartItems.hasTransferProduct( this.props.cart )
		);
	}

	getNumberOfDomainRegistrations() {
		return cartItems.getDomainRegistrations( this.props.cart ).length;
	}

	getTldsWithAdditionalForm() {
		if ( ! config.isEnabled( 'domains/cctlds' ) ) {
			// All we need to do to disable everything is not show the .FR form
			return [];
		}
		return intersection( cartItems.getTlds( this.props.cart ), tldsWithAdditionalDetailsForms );
	}

	needsFax() {
		return (
			this.props.contactDetails.countryCode === 'NL' && cartItems.hasTld( this.props.cart, 'nl' )
		);
	}

	getSubmitButtonText() {
		return this.hasAnotherStep()
			? this.props.translate( 'Continue' )
			: this.props.translate( 'Continue to Checkout' );
	}

	renderSubmitButton() {
		return (
			<FormButton
				className="checkout__domain-details-form-submit-button"
				onClick={ this.handleSubmitButtonClick }
			>
				{ this.getSubmitButtonText() }
			</FormButton>
		);
	}

	handleContactDetailsChange = newContactDetailsValues => {
		this.props.updateContactDetailsCache( newContactDetailsValues );
	};

	renderBillingContactDetailsFields() {
		const { contactDetails, translate, userCountryCode } = this.props;
		const labelTexts = {
			organization: translate( '+ Add Organization Name' ),
		};
		return (
			<BillingDetailsFormFields
				userCountryCode={ userCountryCode }
				contactDetails={ contactDetails }
				needsFax={ this.needsFax() }
				needsOnlyGoogleAppsDetails={ this.needsOnlyGoogleAppsDetails() }
				onContactDetailsChange={ this.handleContactDetailsChange }
				onSubmit={ this.handleSubmitButtonClick }
				eventFormName="Checkout Form"
				onValidate={ this.validate }
				labelTexts={ labelTexts }
				cart={ this.props.cart }
			/>
		);
	}

	renderDetailsForm() {
		return <form>{ this.renderBillingContactDetailsFields() }</form>;
	}

	renderExtraDetailsForm( tld ) {
		return (
			<ExtraInfoForm tld={ tld } getDomainNames={ this.getDomainNames }>
				{ this.renderSubmitButton() }
			</ExtraInfoForm>
		);
	}

	handleSubmitButtonClick = event => {
		if ( event && event.preventDefault ) {
			event.preventDefault();
		}
		if ( this.hasAnotherStep() ) {
			return this.switchToNextStep();
		}
		this.finish();
	};

	finish() {
		const allFieldValues = this.props.contactDetails;
		debug( 'finish: allFieldValues:', allFieldValues );
		setDomainDetails( allFieldValues );
		addGoogleAppsRegistrationData( allFieldValues );
	}

	renderCurrentForm() {
		const { currentStep } = this.state;
		return includes( tldsWithAdditionalDetailsForms, currentStep )
			? this.renderExtraDetailsForm( this.state.currentStep )
			: this.renderDetailsForm();
	}

	render() {
		const classSet = classNames( {
			'domain-details': true,
			selected: true,
		} );

		let title;
		let message;
		// TODO: gather up tld specific stuff
		if ( this.state.currentStep === 'fr' ) {
			title = this.props.translate( '.FR Registration' );
		} else if ( this.needsOnlyGoogleAppsDetails() ) {
			title = this.props.translate( 'G Suite Account Information' );
		} else if ( this.needsDomainDetails() ) {
			//@TODO Need to figure out how to display this only if domains are in the cart
			title = this.props.translate( 'Billing & Domain Contact Information' );
			message = this.props.translate(
				'For your convenience, we have pre-filled your WordPress.com contact information. Please ' +
					"review this to be sure it's correct."
			);
		} else {
			title = this.props.translate( 'Billing Information' );
			message = this.props.translate(
				'For your convenience, we have pre-filled your WordPress.com contact information. Please ' +
					"review this to be sure it's correct."
			);
		}

		return (
			<div>
				<QueryTldValidationSchemas tlds={ this.getTldsWithAdditionalForm() } />
				<PaymentBox currentPage={ this.state.currentStep } classSet={ classSet } title={ title }>
					{ message && <p>{ message }</p> }
					{ this.renderCurrentForm() }
				</PaymentBox>
			</div>
		);
	}
}

export class BillingDetailsFormContainer extends PureComponent {
	render() {
		return (
			<div>
				<QueryContactDetailsCache />
				{ this.props.contactDetails ? (
					<BillingDetailsForm { ...this.props } />
				) : (
					<SecurePaymentFormPlaceholder />
				) }
			</div>
		);
	}
}

export default connect(
	state => ( { contactDetails: getContactDetailsCache( state ) } ),
	{
		recordTracksEvent,
		updateContactDetailsCache,
	}
)( localize( BillingDetailsFormContainer ) );
