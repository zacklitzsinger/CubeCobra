import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import CardPropType from 'proptypes/CardPropType';

import { Button, Col, Form, ListGroupItem, Row, Spinner } from 'reactstrap';

import { csrfFetch } from 'utils/CSRF';

import AutocompleteInput from 'components/AutocompleteInput';
import CardModalContext from 'contexts/CardModalContext';
import CardModalForm from 'components/CardModalForm';
import ChangelistContext from 'contexts/ChangelistContext';
import CubeContext from 'contexts/CubeContext';
import DisplayContext from 'contexts/DisplayContext';
import { getCard } from 'components/EditCollapse';
import LoadingButton from 'components/LoadingButton';
import MaybeboardContext from 'contexts/MaybeboardContext';
import TableView from 'components/TableView';
import { getCardColorClass } from 'contexts/TagContext';
import withAutocard from 'components/WithAutocard';

const AutocardItem = withAutocard(ListGroupItem);

const MaybeboardListItem = ({ card, className }) => {
  const { canEdit, cubeID } = useContext(CubeContext);
  const { removeMaybeboardCard } = useContext(MaybeboardContext);
  const { removeInputRef, setAddValue, openEditCollapse } = useContext(ChangelistContext);
  const openCardModal = useContext(CardModalContext);
  const [loading, setLoading] = useState(false);

  const handleEdit = useCallback(() => {
    openCardModal(card, true);
  }, [card, openCardModal]);

  const handleAdd = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setAddValue(card.details.name);
      openEditCollapse();
      if (removeInputRef.current) {
        removeInputRef.current.focus();
      }
    },
    [card, setAddValue, openEditCollapse, removeInputRef],
  );

  const handleRemove = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const index = parseInt(event.currentTarget.getAttribute('data-index'), 10);
      if (!Number.isInteger(index)) {
        console.error('Bad index');
        return;
      }

      setLoading(true);
      const response = await csrfFetch(`/cube/api/maybe/${cubeID}`, {
        method: 'POST',
        body: JSON.stringify({
          remove: [index],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success === 'true') {
          removeMaybeboardCard(index);
          /* eslint-disable-line no-undef */ autocard_hide_card();
        } else {
          setLoading(false);
          console.error(json.message);
        }
      }
    },
    [removeMaybeboardCard, cubeID],
  );

  return (
    <AutocardItem
      className={`d-flex card-list-item ${getCardColorClass(card)} ${className || ''}`}
      card={card}
      data-index={card.index}
      onClick={handleEdit}
      role="button"
    >
      <div className="name">{card.details.name}</div>
      {canEdit &&
        (loading ? (
          <Spinner size="sm" className="ms-auto" />
        ) : (
          <>
            <button
              type="button"
              className="icon-button ms-auto"
              data-index={card.index}
              onClick={handleAdd}
              aria-label="Add"
            >
              <span aria-hidden="true">+</span>
            </button>
            <Button
              size="sm"
              close
              className="float-none"
              data-index={card.index}
              onClick={handleRemove}
              aria-label="Remove"
            />
          </>
        ))}
    </AutocardItem>
  );
};

MaybeboardListItem.propTypes = {
  card: CardPropType.isRequired,
  className: PropTypes.string,
};

MaybeboardListItem.defaultProps = {
  className: null,
};

const Maybeboard = ({ filter, ...props }) => {
  const { canEdit, cubeID } = useContext(CubeContext);
  const { toggleShowMaybeboard } = useContext(DisplayContext);
  const { maybeboard, addMaybeboardCard } = useContext(MaybeboardContext);
  const addInput = useRef();
  const [loading, setLoading] = useState(false);

  const handleAdd = useCallback(
    async (event, newValue) => {
      event.preventDefault();
      if (!addInput.current) return;
      try {
        setLoading(true);
        const card = await getCard(cubeID, newValue || addInput.current.value);
        if (!card) {
          setLoading(false);
          return;
        }

        const response = await csrfFetch(`/cube/api/maybe/${cubeID}`, {
          method: 'POST',
          body: JSON.stringify({
            add: [{ details: card }],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const json = await response.json();
          if (json.success === 'true') {
            addMaybeboardCard({ _id: json.added[card._id], cardID: card._id, details: card, tags: [] });
          } else {
            console.error(json.message);
          }
        }
        setLoading(false);

        addInput.current.value = '';
        addInput.current.focus();
      } catch (e) {
        console.error(e);
      }
    },
    [addMaybeboardCard, addInput, cubeID],
  );

  const maybeboardIndex = useMemo(() => maybeboard.map((card, index) => ({ ...card, index })), [maybeboard]);

  const filteredMaybeboard = useMemo(() => {
    return filter ? maybeboardIndex.filter(filter) : maybeboardIndex;
  }, [filter, maybeboardIndex]);

  return (
    <CardModalForm>
      <Row>
        <Col className="me-auto">
          <h4>Maybeboard</h4>
        </Col>
        <Col xs="auto">
          <Button color="primary" size="sm" onClick={toggleShowMaybeboard}>
            Hide <span className="d-none d-sm-inline">Maybeboard</span>
          </Button>
        </Col>
      </Row>
      {canEdit && (
        <Form className="mt-2 w-100" onSubmit={handleAdd}>
          <Row noGutters>
            <Col xs="9" sm="auto" className="pe-2">
              <AutocompleteInput
                treeUrl="/cube/api/cardnames"
                treePath="cardnames"
                type="text"
                className="w-100"
                disabled={loading}
                innerRef={addInput}
                onSubmit={handleAdd}
                placeholder="Card to Add"
                autoComplete="off"
                data-lpignore
              />
            </Col>
            <Col xs="3" sm="auto">
              <LoadingButton color="accent" type="submit" className="w-100" loading={loading}>
                Add
              </LoadingButton>
            </Col>
          </Row>
        </Form>
      )}
      {filteredMaybeboard.length === 0 ? (
        <h5 className="mt-3">
          No cards in maybeboard
          {filter ? ' matching filter.' : '.'}
        </h5>
      ) : (
        <TableView className="mt-3" cards={filteredMaybeboard} rowTag={MaybeboardListItem} noGroupModal {...props} />
      )}
      <hr />
    </CardModalForm>
  );
};

Maybeboard.propTypes = {
  filter: PropTypes.func,
};

Maybeboard.defaultProps = {
  filter: null,
};

export default Maybeboard;
