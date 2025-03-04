import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import TimeAgo from 'react-timeago';

import UserContext from 'contexts/UserContext';
import CardPackagePropType from 'proptypes/CardPackagePropType';
import withAutocard from 'components/WithAutocard';
import AddGroupToCubeModal from 'components/AddGroupToCubeModal';
import withModal from 'components/WithModal';
import TextBadge from 'components/TextBadge';
import Tooltip from 'components/Tooltip';
import CommentsSection from 'components/CommentsSection';

import { CardHeader, Card, CardBody, Row, Col, Button } from 'reactstrap';

import { csrfFetch } from 'utils/CSRF';

const AddGroupToCubeModalLink = withModal(Button, AddGroupToCubeModal);
const AutocardA = withAutocard('a');

const CardPackage = ({ cardPackage, refresh }) => {
  const user = useContext(UserContext);

  const voted = user ? cardPackage.voters.includes(user.id) : false;

  const toggleVote = async () => {
    if (voted) {
      // downvote
      const response = await csrfFetch(`/packages/downvote/${cardPackage._id}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success === 'true') {
          refresh();
        }
      }
    } else {
      // upvote
      const response = await csrfFetch(`/packages/upvote/${cardPackage._id}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success === 'true') {
          refresh();
        }
      }
    }
  };

  const approve = async () => {
    const response = await csrfFetch(`/packages/approve/${cardPackage._id}`);
    if (response.ok) {
      refresh();
    }
  };

  const unapprove = async () => {
    const response = await csrfFetch(`/packages/unapprove/${cardPackage._id}`);
    if (response.ok) {
      refresh();
    }
  };

  const remove = async () => {
    const response = await csrfFetch(`/packages/remove/${cardPackage._id}`);
    if (response.ok) {
      refresh();
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="ps-4 pe-0 pt-2 pb-0">
        <Row>
          <Col xs="12" sm="6">
            <h5 className="card-title">
              <a href={`/packages/${cardPackage._id}`}>{cardPackage.title}</a>
            </h5>
            <h6 className="card-subtitle mb-2 text-muted">
              <a href={`/user/view/${cardPackage.userid}`}>{cardPackage.username}</a>
              {' submitted '}
              <TimeAgo date={cardPackage.date} />
            </h6>
          </Col>

          {user ? (
            <Col xs="12" sm="6" className="pb-2">
              <div className="flex-container flex-row-reverse">
                <TextBadge name="Votes" className="mx-2">
                  <Tooltip text={voted ? 'Click to remove your upvote' : 'Click to upvote this package'}>
                    <button
                      type="button"
                      className="cube-id-btn"
                      onKeyDown={() => {}}
                      onClick={() => {
                        toggleVote();
                      }}
                    >
                      {voted ? <b>{cardPackage.votes}</b> : cardPackage.votes}
                    </button>
                  </Tooltip>
                </TextBadge>

                <AddGroupToCubeModalLink
                  outline
                  color="accent"
                  modalProps={{ cards: cardPackage.cards, cubes: user ? user.cubes : [], packid: cardPackage._id }}
                >
                  Add To Cube
                </AddGroupToCubeModalLink>
                {user.roles.includes('Admin') && (
                  <>
                    {cardPackage.approved ? (
                      <Button outline color="unsafe" className="mx-2" onClick={unapprove}>
                        Remove Approval
                      </Button>
                    ) : (
                      <Button outline color="accent" className="mx-2" onClick={approve}>
                        Approve
                      </Button>
                    )}
                    <Button outline color="unsafe" onClick={remove}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </Col>
          ) : (
            <Col xs="6">
              <div className="float-end">
                <TextBadge name="Votes" className="me-2">
                  <Tooltip text="Login to upvote">{cardPackage.votes}</Tooltip>
                </TextBadge>
              </div>
            </Col>
          )}
        </Row>
      </CardHeader>
      <CardBody>
        <Row>
          {cardPackage.cards.map((cardId) => (
            <Col key={`${cardPackage._id}-${cardId}`} className="col-6 col-md-2-4 col-lg-2-4 col-xl-2-4">
              <Card className="mb-3">
                <AutocardA href={`/tool/card/${cardId}`} front={`/tool/cardimage/${cardId}`} target="_blank">
                  <img className="w-100" src={`/tool/cardimage/${cardId}`} alt={cardId} />
                </AutocardA>
              </Card>
            </Col>
          ))}
        </Row>
      </CardBody>
      <div className="border-top">
        <CommentsSection parentType="package" parent={cardPackage._id} collapse />
      </div>
    </Card>
  );
};

CardPackage.propTypes = {
  cardPackage: CardPackagePropType.isRequired,
  refresh: PropTypes.func,
};

CardPackage.defaultProps = {
  refresh: () => {},
};

export default CardPackage;
