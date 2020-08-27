import React from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import styled from 'styled-components';

import Body from './Body';
import Container from './Container';
import Footer from './Footer';
import Header from './Header';
import HostsWithData from './HostsWithData';
import Link from './Link';
import { H1, P } from './Text';

const CoverSmallCTA = styled.span`
  a:hover {
    text-decoration: underline !important;
  }
`;

const HostsContainer = styled.div`
  .success {
    color: green;
  }
  .error {
    color: red;
  }
  .login {
    text-align: center;
  }
  .actions {
    text-align: center;
    margin-bottom: 5rem;
  }
`;

class Hosts extends React.Component {
  static propTypes = {
    collective: PropTypes.object,
    LoggedInUser: PropTypes.object,
    intl: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { status: 'idle', result: {} };
    this.messages = defineMessages({
      'hosts.title': {
        id: 'hosts.title',
        defaultMessage: 'Open Collective Hosts',
      },
      'hosts.description': {
        id: 'hosts.description',
        defaultMessage:
          "Hosts are legal entities that collect money on behalf of open collectives so that they don't have to worry about accounting, taxes, etc. Some also provide extra services. {findOutMoreLink}",
      },
      'hosts.findOutMoreLink': {
        id: 'hosts.description.findOutMoreLink',
        defaultMessage: 'Find out more about becoming an Open Collective Host.',
      },
    });
  }

  render() {
    const { LoggedInUser, intl } = this.props;

    const title = intl.formatMessage(this.messages['hosts.title']);

    const findOutMoreMessage = intl.formatMessage(this.messages['hosts.findOutMoreLink']);

    const findOutMoreLink = (
      <CoverSmallCTA>
        <Link route="https://docs.opencollective.com/help/fiscal-hosts/become-a-fiscal-host">{findOutMoreMessage}</Link>
      </CoverSmallCTA>
    );

    const description = (
      <FormattedMessage
        id="hosts.description"
        defaultMessage="Hosts are legal entities that collect money on behalf of open collectives so that they don't have to worry about accounting, taxes, etc. Some also provide extra services. {findOutMoreLink}"
        values={{ findOutMoreLink }}
      />
    );

    return (
      <HostsContainer>
        <Header
          title={title}
          description={description}
          twitterHandle="opencollect"
          className={this.state.status}
          LoggedInUser={LoggedInUser}
        />

        <Body>
          <Container mt={2} mb={2}>
            <H1 fontSize={['24px', '40px']} lineHeight={3} fontWeight="bold" textAlign="center" color="black.900">
              {title}
            </H1>
            <P textAlign="center">{description}</P>
          </Container>

          <div className="content">
            <HostsWithData LoggedInUser={LoggedInUser} />
          </div>
        </Body>
        <Footer />
      </HostsContainer>
    );
  }
}

export default injectIntl(Hosts);
