import React, { useCallback, useContext, useState } from 'react';
import PropTypes from 'prop-types';

import {
  Button,
  Col,
  Collapse,
  Form,
  InputGroup,
  Row,
  UncontrolledAlert,
  FormGroup,
  Label,
  Input,
  Card,
  FormText,
  InputGroupText,
} from 'reactstrap';

import Query from 'utils/Query';
import { encodeName } from 'utils/Card';
import { findUserLinks } from 'markdown/parser';

import AutocompleteInput from 'components/AutocompleteInput';
import Changelist from 'components/Changelist';
import ChangelistContext from 'contexts/ChangelistContext';
import CubeContext from 'contexts/CubeContext';
import CSRFForm from 'components/CSRFForm';
import DisplayContext from 'contexts/DisplayContext';
import ResizeModal from 'components/ResizeModal';
import TextEntry from 'components/TextEntry';

export const getCard = async (cubeID, name, setAlerts) => {
  if (name && name.length > 0) {
    const normalized = encodeName(name);
    const response = await fetch(`/cube/api/getcardforcube/${cubeID}/${normalized}`);
    if (!response.ok) {
      const message = `Couldn't get card: ${response.status}.`;
      if (setAlerts) {
        setAlerts((alerts) => [...alerts, { color: 'danger', message }]);
      } else {
        console.error(message);
      }
      return null;
    }

    const json = await response.json();
    if (json.success !== 'true' || !json.card) {
      const message = `Couldn't find card [${name}].`;
      if (setAlerts) {
        setAlerts((alerts) => [...alerts, { color: 'danger', message }]);
      } else {
        console.error(message);
      }
      return null;
    }
    return json.card;
  }
  return null;
};

const EditCollapse = ({ cubeView, ...props }) => {
  const [alerts, setAlerts] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [mentions, setMentions] = useState('');
  const [specifyEdition, setSpecifyEdition] = useState(false);

  const {
    changes,
    addValue,
    setAddValue,
    removeValue,
    setRemoveValue,
    addInputRef,
    removeInputRef,
    addChange,
    setChanges,
  } = useContext(ChangelistContext);
  const { cube, cubeID } = useContext(CubeContext);
  const { toggleShowMaybeboard } = useContext(DisplayContext);

  const additions = changes.filter((change) => change.add || change.replace).length;
  const removals = changes.filter((change) => change.remove || change.replace).length;
  const newTotal = cube.cards.length + additions - removals;

  const scaleParams = Query.get('scale', 'medium');

  const handleChange = useCallback(
    (event) => {
      return {
        textarea: setPostContent,
        add: setAddValue,
        remove: setRemoveValue,
      }[event.target.name](event.target.value);
    },
    [setAddValue, setRemoveValue],
  );

  const handleAdd = useCallback(
    async (event, newValue) => {
      event.preventDefault();
      try {
        const card = await getCard(cubeID, newValue || addValue, setAlerts);
        if (!card) {
          return;
        }
        addChange({ add: { details: card } });
        setAddValue('');
        setRemoveValue('');
        if (addInputRef.current) {
          addInputRef.current.focus();
        }
      } catch (e) {
        console.error(e);
      }
    },
    [addChange, addValue, addInputRef, cubeID, setAddValue, setRemoveValue],
  );

  const handleRemoveReplace = useCallback(
    async (event, newValue) => {
      event.preventDefault();
      const replace = addValue.length > 0;
      try {
        const cardOut = cube.cards.find(
          (card) =>
            card.details.name.toLowerCase() === (newValue || removeValue).toLowerCase() &&
            !changes.some(
              (change) =>
                (change.remove && change.remove.index === card.index) ||
                (Array.isArray(change.replace) && change.replace[0].index === card.index),
            ),
        );
        if (!cardOut) {
          setAlerts((items) => [
            ...items,
            { color: 'danger', message: `Couldn't find a card with name [${newValue || removeValue}].` },
          ]);
          return;
        }
        if (replace) {
          const cardIn = await getCard(cubeID, addValue, setAlerts);
          if (!cardIn) {
            return;
          }
          addChange({ replace: [cardOut, { details: cardIn }] });
        } else {
          addChange({ remove: cardOut });
        }
        setAddValue('');
        setRemoveValue('');
        /* If replace, put focus back in addInputRef; otherwise leave it here. */
        const focus = replace ? addInputRef : removeInputRef;
        if (focus.current) {
          focus.current.focus();
        }
      } catch (e) {
        console.error(e);
      }
    },
    [addChange, addInputRef, addValue, removeInputRef, removeValue, cube, cubeID, changes, setAddValue, setRemoveValue],
  );

  const handleDiscardAll = useCallback(() => {
    setChanges([]);
  }, [setChanges]);

  const handleMentions = useCallback(() => {
    setMentions(findUserLinks(postContent).join(';'));
  }, [postContent]);

  return (
    <Collapse className="px-3" {...props}>
      {alerts.map(({ color, message }) => (
        <UncontrolledAlert color={color} className="mt-2">
          {message}
        </UncontrolledAlert>
      ))}
      <Row noGutters className="me-auto">
        <Col xs={12} md="auto">
          <Form className="mb-2 me-2" onSubmit={handleAdd}>
            <InputGroup className="flex-nowrap">
              <AutocompleteInput
                treeUrl={specifyEdition ? '/cube/api/fullnames' : '/cube/api/cardnames'}
                treePath="cardnames"
                type="text"
                innerRef={addInputRef}
                name="add"
                value={addValue}
                onChange={handleChange}
                onSubmit={handleAdd}
                placeholder="Card to Add"
                autoComplete="off"
                data-lpignore
                className="square-right"
              />
              <Button color="accent" type="submit" disabled={addValue.length === 0}>
                Add
              </Button>
            </InputGroup>
          </Form>
        </Col>
        <Col xs={12} md="auto">
          <Form className="mb-2 me-2" onSubmit={handleRemoveReplace}>
            <InputGroup className="flex-nowrap">
              <AutocompleteInput
                cubeId={cube._id}
                treeUrl={`/cube/api/cubecardnames/${cubeID}`}
                treePath="cardnames"
                type="text"
                innerRef={removeInputRef}
                name="remove"
                value={removeValue}
                onChange={handleChange}
                onSubmit={handleRemoveReplace}
                placeholder="Card to Remove"
                autoComplete="off"
                data-lpignore
                className="square-right"
              />
              <Button color="accent" type="submit" disabled={removeValue.length === 0}>
                Remove/Replace
              </Button>
            </InputGroup>
          </Form>
        </Col>
        <Col xs="auto">
          <Form className="mb-2 me-2">
            <InputGroup>
              <InputGroupText>
                <Input
                  addon
                  type="checkbox"
                  aria-label="Checkbox for following text input"
                  checked={specifyEdition}
                  onChange={() => setSpecifyEdition(!specifyEdition)}
                />
              </InputGroupText>
              <Input disabled value="Specify Versions" />
            </InputGroup>
          </Form>
        </Col>
        <Col xs={12} md="auto" className="ms-md-auto">
          <ResizeModal cubeID={cubeID} />
          <Button color="accent" className="mb-2" onClick={toggleShowMaybeboard}>
            Maybeboard
          </Button>
        </Col>
      </Row>
      <Collapse isOpen={changes.length > 0} className="pt-1">
        <CSRFForm
          method="POST"
          action={`/cube/edit/${cubeID}?view=${encodeURIComponent(cubeView)}&scale=${encodeURIComponent(scaleParams)}`}
          onSubmit={handleMentions}
        >
          <Row>
            <Col>
              <h6>
                <Row>
                  <Col>Changelist</Col>
                  <Col className="col-sm-auto">
                    <div className="text-secondary">
                      +{additions}, -{removals}, {newTotal} Total
                    </div>
                  </Col>
                </Row>
              </h6>
              <div className="changelist-container mb-2">
                <Changelist />
              </div>
            </Col>
            <Col>
              <h6>Blog Post</h6>
              <FormGroup>
                <Label className="visually-hidden">Blog Title</Label>
                <Input type="text" name="title" defaultValue="Cube Updated – Automatic Post" />
              </FormGroup>
              <FormGroup>
                <Label className="visually-hidden">Blog Body</Label>
                <Card>
                  <TextEntry name="blog" value={postContent} onChange={handleChange} maxLength={10000} />
                </Card>
                <Input type="hidden" name="mentions" value={mentions} />
                <FormText>
                  Having trouble formatting your posts? Check out the{' '}
                  <a href="/markdown" target="_blank">
                    markdown guide
                  </a>
                  .
                </FormText>
              </FormGroup>
            </Col>
          </Row>
          <Row className="mb-2">
            <Col>
              <Button color="accent" className="me-2" type="submit">
                Save Changes
              </Button>
              <Button color="unsafe" onClick={handleDiscardAll}>
                Discard All
              </Button>
            </Col>
          </Row>
        </CSRFForm>
      </Collapse>
    </Collapse>
  );
};

EditCollapse.propTypes = {
  cubeView: PropTypes.string.isRequired,
};

export default EditCollapse;
