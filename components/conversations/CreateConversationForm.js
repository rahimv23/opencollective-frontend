import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, defineMessages, useIntl } from 'react-intl';
import { useFormik } from 'formik';
import { Flex, Box } from '../Grid';
import { useMutation } from '@apollo/react-hooks';

import { gqlV2, API_V2_CONTEXT } from '../../lib/graphql/helpers';
import { getErrorFromGraphqlException, ERROR, createError } from '../../lib/errors';
import StyledInput from '../StyledInput';
import RichTextEditor from '../RichTextEditor';
import StyledButton from '../StyledButton';
import MessageBox from '../MessageBox';
import LoadingPlaceholder from '../LoadingPlaceholder';
import { P, H4 } from '../Text';
import StyledInputTags from '../StyledInputTags';
import CreateConversationFAQ from '../faqs/CreateConversationFAQ';
import FormPersister from '../../lib/form-persister';
import { formatFormErrorMessage } from '../../lib/form-utils';

const CreateConversationMutation = gqlV2`
  mutation CreateConversation($title: String!, $html: String!, $CollectiveId: String!, $tags: [String]) {
    createConversation(title: $title, html: $html, CollectiveId: $CollectiveId, tags: $tags) {
      id
      slug
      title
      summary
      tags
      createdAt
    }
  }
`;

const mutationOptions = { context: API_V2_CONTEXT };

const messages = defineMessages({
  titlePlaceholder: {
    id: 'CreateConversation.Title.Placeholder',
    defaultMessage: 'Start with a title for your conversation here',
  },
  bodyPlaceholder: {
    id: 'CreateConversation.Body.Placeholder',
    defaultMessage:
      'You can add links, lists, code snipets and more using this text editor. Type and start adding content to your conversation here.',
  },
});

const validate = values => {
  const errors = {};
  const { title, html } = values;

  if (!title) {
    errors.title = createError(ERROR.FORM_FIELD_REQUIRED);
  } else if (title.length < 3) {
    errors.title = createError(ERROR.FORM_FIELD_MIN_LENGTH);
  } else if (title.length > 255) {
    errors.title = createError(ERROR.FORM_FIELD_MAX_LENGTH);
  }

  if (!html) {
    errors.html = createError(ERROR.FORM_FIELD_REQUIRED);
  }

  return errors;
};

/**
 * Form to create a new conversation. User must be authenticated.
 *
 * /!\ Can only be used with data from API V2.
 */
const CreateConversationForm = ({ collective, LoggedInUser, suggestedTags, onSuccess, disabled, loading }) => {
  const intl = useIntl();
  const { id: collectiveId, slug: collectiveSlug } = collective;
  const { formatMessage } = useIntl();
  const [createConversation, { error: submitError }] = useMutation(CreateConversationMutation, mutationOptions);
  const [formPersister] = React.useState(new FormPersister());

  const { values, errors, getFieldProps, handleSubmit, setFieldValue, setValues, isSubmitting, touched } = useFormik({
    initialValues: {
      title: '',
      html: '',
      tags: [],
    },
    validate,
    onSubmit: async values => {
      const response = await createConversation({ variables: { ...values, CollectiveId: collectiveId } });
      formPersister.clearValues();
      return onSuccess(response.data.createConversation);
    },
  });

  // Load values from localstorage
  useEffect(() => {
    if (!loading && LoggedInUser && !values.title && !values.html && !values.tags.length) {
      const id = `conversation-${collectiveSlug}-${LoggedInUser.id}`;
      formPersister.setFormId(id);
    }

    const formValues = formPersister.loadValues();
    if (formValues && !values.title && !values.html && !values.tags.length) {
      setValues(formValues);
    }
  }, [loading, LoggedInUser]);

  // Save values in localstorage
  useEffect(() => {
    if (values.title || values.html || values.tags.length || !formPersister.loadValues()) {
      formPersister.saveValues({ html: values.html, tags: values.tags, title: values.title });
    }
  }, [values.title, values.html, values.tags]);

  return (
    <form onSubmit={handleSubmit}>
      <Flex flexWrap="wrap">
        <Box flex={['1 1 100%', null, null, '1 1']}>
          {loading ? (
            <LoadingPlaceholder height={36} />
          ) : (
            <StyledInput
              name="title"
              {...getFieldProps('title')}
              bare
              data-cy="conversation-title-input"
              error={touched.title && errors.title}
              withOutline
              width="100%"
              fontSize="H4"
              border="none"
              maxLength={255}
              px={0}
              py={0}
              placeholder={formatMessage(messages.titlePlaceholder)}
            />
          )}
          {errors.title && touched.title && (
            <P color="red.500" mt={3}>
              {formatFormErrorMessage(intl, errors.title)}
            </P>
          )}
          <Box my={3}>
            {loading ? (
              <LoadingPlaceholder height={228} />
            ) : (
              <RichTextEditor
                inputName="html"
                {...getFieldProps('html')}
                withStickyToolbar
                toolbarOffsetY={0}
                placeholder={formatMessage(messages.bodyPlaceholder)}
                editorMinHeight={225}
                fontSize="13px"
                error={touched.html && errors.html}
                defaultValue={values.html}
              />
            )}
          </Box>
          {errors.html && touched.html && (
            <P color="red.500" mt={3}>
              {errors.html.type === ERROR.FORM_FIELD_REQUIRED && (
                <FormattedMessage id="Error.FieldRequired" defaultMessage="This field is required" />
              )}
            </P>
          )}
        </Box>
        <Box flex="0 1 300px" ml={[null, null, null, 4]}>
          <Box mb={4}>
            <H4 fontWeight="normal" mb={2}>
              <FormattedMessage id="Tags" defaultMessage="Tags" />
            </H4>
            <Box>
              {loading ? (
                <LoadingPlaceholder height={38} />
              ) : (
                <StyledInputTags
                  name="tags"
                  {...getFieldProps('tags')}
                  maxWidth={300}
                  suggestedTags={suggestedTags}
                  onChange={options => {
                    const tags = [];
                    options && options.length > 0 ? options.map(option => tags.push(option.value)) : [];
                    setFieldValue('tags', tags);
                  }}
                />
              )}
            </Box>
          </Box>
          <Box display={['none', null, null, 'block']}>
            <H4 fontWeight="normal" mb={2}>
              <FormattedMessage id="FAQ" defaultMessage="FAQ" />
            </H4>
            <CreateConversationFAQ title={null} withBorderLeft />
          </Box>
        </Box>
      </Flex>
      {submitError && (
        <MessageBox type="error" mt={3}>
          {getErrorFromGraphqlException(submitError).message}
        </MessageBox>
      )}
      <StyledButton
        type="submit"
        buttonStyle="primary"
        data-cy="submit-new-conversation-btn"
        disabled={disabled || loading}
        loading={isSubmitting}
        minWidth={200}
        mt={3}
      >
        <FormattedMessage id="CreateConversationForm.Submit" defaultMessage="Submit conversation" />
      </StyledButton>
    </form>
  );
};

CreateConversationForm.propTypes = {
  /** the collective where the conversation will be created */
  collective: PropTypes.object.isRequired,
  /** Called when the conversation gets successfully created. Return a promise if you want to keep the submitting state active. */
  onSuccess: PropTypes.func.isRequired,
  /** Will disable the form */
  disabled: PropTypes.bool,
  /** Will show a loading state. Use this if loggedInUser or required data is not loaded yet. */
  loading: PropTypes.bool,
  /** Tags suggested for this new conversation */
  suggestedTags: PropTypes.arrayOf(PropTypes.string),
  /** LoggedInUser */
  LoggedInUser: PropTypes.object,
};

export default CreateConversationForm;
