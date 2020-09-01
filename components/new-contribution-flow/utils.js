import React from 'react';
import * as LibTaxes from '@opencollective/taxes';
import { find, get, sortBy, uniqBy } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { CollectiveType } from '../../lib/constants/collectives';
import { GQLV2_PAYMENT_METHOD_TYPES } from '../../lib/constants/payment-methods';
import { AmountTypes } from '../../lib/constants/tiers-types';
import { VAT_OPTIONS } from '../../lib/constants/vat';
import { getPaymentMethodName } from '../../lib/payment_method_label';
import {
  getPaymentMethodIcon,
  getPaymentMethodMetadata,
  isPaymentMethodDisabled,
} from '../../lib/payment-method-utils';

import CreditCardInactive from '../../components/icons/CreditCardInactive';

/** Returns true if taxes may apply with this tier/host */
export const taxesMayApply = (collective, host, tier) => {
  if (!tier) {
    return false;
  } else if (tier.amountType === AmountTypes.FIXED && !tier.amount.valueInCents) {
    return false;
  }

  // Don't apply VAT if not configured (default)
  const vatType = get(collective, 'settings.VAT.type') || get(collective, 'parent.settings.VAT.type');
  const hostCountry = get(host.location, 'country');
  const collectiveCountry = get(collective.location, 'country');
  const parentCountry = get(collective, 'parent.location.country');
  const country = collectiveCountry || parentCountry || hostCountry;

  if (!vatType) {
    return false;
  } else if (vatType === VAT_OPTIONS.OWN) {
    return LibTaxes.getVatOriginCountry(tier.type, country, country);
  } else {
    return LibTaxes.getVatOriginCountry(tier.type, hostCountry, country);
  }
};

export const NEW_CREDIT_CARD_KEY = 'newCreditCard';

export const generatePaymentMethodOptions = (paymentMethods, stepProfile, stepDetails, stepSummary, collective) => {
  const supportedPaymentMethods = get(collective, 'host.supportedPaymentMethods', []);
  const hostHasManual = supportedPaymentMethods.includes(GQLV2_PAYMENT_METHOD_TYPES.BANK_TRANSFER);
  const hostHasPaypal = supportedPaymentMethods.includes(GQLV2_PAYMENT_METHOD_TYPES.PAYPAL);
  const hostHasStripe = supportedPaymentMethods.includes(GQLV2_PAYMENT_METHOD_TYPES.CREDIT_CARD);
  const totalAmount = getTotalAmount(stepDetails, stepSummary);

  const paymentMethodsOptions = paymentMethods.map(pm => ({
    id: pm.id,
    key: `pm-${pm.id}`,
    title: getPaymentMethodName(pm),
    subtitle: getPaymentMethodMetadata(pm, totalAmount),
    icon: getPaymentMethodIcon(pm),
    disabled: isPaymentMethodDisabled(pm, totalAmount),
    paymentMethod: pm,
  }));

  let uniquePMs = uniqBy(paymentMethodsOptions, 'id');

  // if ORG filter out 'collective' type payment
  if (stepProfile.type === CollectiveType.ORGANIZATION) {
    uniquePMs = uniquePMs.filter(
      ({ paymentMethod }) => paymentMethod.providerType !== GQLV2_PAYMENT_METHOD_TYPES.ACCOUNT_BALANCE,
    );
  }

  // prepaid budget: limited to a specific host
  const matchesHostCollectiveIdPrepaid = prepaid => {
    const hostCollectiveLegacyId = get(collective, 'host.legacyId');
    const prepaidLimitedToHostCollectiveIds = get(prepaid, 'limitedToHosts');
    return find(prepaidLimitedToHostCollectiveIds, { legacyId: hostCollectiveLegacyId });
  };

  // gift card: can be limited to a specific host, see limitedToHosts
  const matchesHostCollectiveId = giftcard => {
    const hostCollectiveId = get(collective, 'host.id');
    const giftcardLimitedToHostCollectiveIds = get(giftcard, 'limitedToHosts');
    return find(giftcardLimitedToHostCollectiveIds, { id: hostCollectiveId });
  };

  uniquePMs = uniquePMs.filter(({ paymentMethod }) => {
    if (paymentMethod.providerType === GQLV2_PAYMENT_METHOD_TYPES.GIFT_CARD && paymentMethod.limitedToHosts) {
      return matchesHostCollectiveId(paymentMethod);
    } else if (paymentMethod.providerType === GQLV2_PAYMENT_METHOD_TYPES.PREPAID_BUDGET) {
      return matchesHostCollectiveIdPrepaid(paymentMethod);
    } else if (!hostHasStripe && paymentMethod.providerType === GQLV2_PAYMENT_METHOD_TYPES.CREDIT_CARD) {
      return false;
    } else {
      return true;
    }
  });

  // Put disabled PMs at the end
  uniquePMs = sortBy(uniquePMs, ['disabled', 'paymentMethod.providerType', 'id']);

  // adding payment methods
  if (stepProfile.type !== CollectiveType.COLLECTIVE) {
    if (hostHasStripe) {
      // New credit card
      uniquePMs.push({
        key: NEW_CREDIT_CARD_KEY,
        title: <FormattedMessage id="contribute.newcreditcard" defaultMessage="New credit/debit card" />,
        icon: <CreditCardInactive />,
      });
    }

    // Paypal
    if (hostHasPaypal && !stepDetails.interval) {
      uniquePMs.push({
        key: 'paypal',
        title: 'PayPal',
        paymentMethod: { type: GQLV2_PAYMENT_METHOD_TYPES.PAYPAL },
        icon: getPaymentMethodIcon({ service: 'paypal', type: 'payment' }, collective),
      });
    }

    // Manual (bank transfer)
    const interval = get(stepDetails, 'interval', null);
    if (hostHasManual && !interval) {
      uniquePMs.push({
        key: 'manual',
        title: get(collective, 'host.settings.paymentMethods.manual.title', null) || 'Bank transfer',
        paymentMethod: { type: GQLV2_PAYMENT_METHOD_TYPES.BANK_TRANSFER },
        icon: getPaymentMethodIcon({ type: 'manual' }, collective),
        instructions: get(collective, 'host.settings.paymentMethods.manual.instructions', null),
      });
    }
  }

  return uniquePMs;
};

export const getTotalAmount = (stepDetails, stepSummary) => {
  const quantity = get(stepDetails, 'quantity') || 1;
  const amount = get(stepDetails, 'amount') || 0;
  const taxAmount = get(stepSummary, 'amount') || 0;
  const platformFeeAmount = get(stepDetails, 'platformContribution') || 0;
  return quantity * (amount + platformFeeAmount) + taxAmount;
};
