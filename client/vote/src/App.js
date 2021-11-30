import React, { useEffect, useState, useRef } from "react";

import "bootstrap/dist/css/bootstrap.min.css";

import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Table from "react-bootstrap/Table";

import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import "./App.css";

function App() {
  const [contractInfo, setContractInfo] = useState({
    web3: null,
    accounts: null,
    contract: null,
    isOwner: false,
  });

  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [winningProposal, setWinningProposal] = useState({
    description: "",
    voteCount: 0,
  });
  const [whitelist, setWhitelist] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [voter, setVoter] = useState({
    isRegistered: false,
    hasVoted: false,
    votedProposalId: null,
  });

  let inputNewVoter = useRef();
  let inputNewProposal = useRef();
  let inputVotedProposal = useRef();

  useEffect(() => {
    (async function () {
      try {
        // Get network provider and web3 instance.
        const web3 = await getWeb3();

        // Use web3 to get the user's accounts.
        const accounts = await web3.eth.getAccounts();

        // Get the contract instance.
        const networkId = await web3.eth.net.getId();

        const deployedNetwork = VotingContract.networks[networkId];
        const instance = new web3.eth.Contract(
          VotingContract.abi,
          deployedNetwork && deployedNetwork.address
        );
        const owner = await instance.methods.owner().call();

        setContractInfo({
          web3: web3,
          accounts: accounts,
          contract: instance,
          isOwner: owner === accounts[0],
        });

        const statusCall = await instance.methods.workflowStatus().call();
        setWorkflowStatus(statusCall);
        console.log(statusCall);

        const whitelistCall = await instance.methods.getWhitelist().call();
        setWhitelist(whitelistCall);

        /*if (owner !== accounts[0]) {
          let voterCall = await instance.methods.getVoter(accounts[0]).call();
          console.log({ voterCall });
          if (voterCall) {
            setVoter(voterCall);
          } else {
            console.log("Not registered");
          }
        }*/

        if (statusCall >= 1) {
          const proposalCall = await instance.methods.getProposals().call();
          console.log(proposalCall);
          setProposals(proposalCall);
        }

        if (statusCall == 5) {
          const winnerCall = await instance.methods.getWinner().call();
          console.log(winnerCall);
          setWinningProposal(winnerCall);
        }
      } catch (error) {
        console.log(error);
        alert(
          `Failed to load web3, accounts, or contract. Check console for details.`
        );
        console.error(error);
      }
    })();
  }, []);

  const addVoter = async () => {
    const addVoterCall = await contractInfo.contract.methods
      .addVoter(inputNewVoter.current.value)
      .send({ from: contractInfo.accounts[0] });

    let valueEvent =
      addVoterCall.events.VoterRegistered.returnValues.voterAddress;
    console.log({ eventEmit: valueEvent });

    await getWhitelist();
    inputNewVoter.current.value = "";
  };

  const addProposal = async () => {
    const addProposalCall = await contractInfo.contract.methods
      .addProposal(inputNewProposal.current.value)
      .send({ from: contractInfo.accounts[0], gasPrice: 100000 });
    await getProposals();
    inputNewProposal.current.value = "";
    let valueEvent =
      addProposalCall.events.ProposalRegistered.returnValues.proposalId;
    console.log({ eventEmit: valueEvent });
  };

  const vote = async () => {
    console.log(inputVotedProposal);
    const addProposalCall = await contractInfo.contract.methods
      .setVote(inputVotedProposal.current.value)
      .send({ from: contractInfo.accounts[0], gasPrice: 100000 });
    await getProposals();
    let valueEvent = addProposalCall.events.Voted.returnValues;
    console.log({ eventEmit: valueEvent });
  };

  const getWorkflowStatus = async () => {
    const statusCall = await contractInfo.contract.methods
      .workflowStatus()
      .call();
    setWorkflowStatus(statusCall);
  };

  const getProposals = async () => {
    const proposalCall = await contractInfo.contract.methods
      .getProposals()
      .call();
    setProposals(proposalCall);
  };

  const getWhitelist = async () => {
    const whitelistCall = await contractInfo.contract.methods
      .getWhitelist()
      .call();
    setWhitelist(whitelistCall);
  };

  const getWinner = async () => {
    const winnerCall = await contractInfo.contract.methods.getWinner().call();
    setWinningProposal(winnerCall);
  };

  const getVoter = async () => {
    const voterCall = await contractInfo.contract.methods
      .getVoter(contractInfo.accounts[0])
      .call();
    setVoter(voterCall);
  };

  const nextWorkflow = async () => {
    switch (parseInt(workflowStatus)) {
      case 0:
        await contractInfo.contract.methods
          .startProposalsRegistering()
          .send({ from: contractInfo.accounts[0], gasPrice: 100000 });

        await getWorkflowStatus();
        break;
      case 1:
        await contractInfo.contract.methods
          .endProposalsRegistering()
          .send({ from: contractInfo.accounts[0], gasPrice: 100000 });
        await getWorkflowStatus();
        break;
      case 2:
        await contractInfo.contract.methods
          .startVotingSession()
          .send({ from: contractInfo.accounts[0], gasPrice: 100000 });
        await getWorkflowStatus();
        break;
      case 3:
        await contractInfo.contract.methods
          .endVotingSession()
          .send({ from: contractInfo.accounts[0], gasPrice: 100000 });
        await getWorkflowStatus();
        break;
      case 4:
        await contractInfo.contract.methods
          .tallyVotes()
          .send({ from: contractInfo.accounts[0], gasPrice: 100000 });

        const winningProposalCall = await contractInfo.contract.methods
          .getWinner()
          .call();
        setWinningProposal(winningProposalCall);
        await getWorkflowStatus();

        break;
      case 5:
        console.log("Fini");
    }
    contractInfo.contract.getPastEvents(
      "WorkflowStatusChange",
      {
        filter: { _from: contractInfo.accounts[0] },
        fromBlock: 0,
        toBlock: "latest",
      },
      function (error, events) {
        if (!error) console.log(events);
      }
    );
  };

  const renderWorklfowStatus = () => {
    let label = "Status du contrat inconnu !";
    switch (parseInt(workflowStatus)) {
      case 0:
        label = "RegisteringVoters";
        break;
      case 1:
        label = "ProposalsRegistrationStarted";
        break;
      case 2:
        label = "ProposalsRegistrationEnded";
        break;
      case 3:
        label = "VotingSessionStarted";
        break;
      case 4:
        label = "VotingSessionEnded";
        break;
      case 5:
        label = "VotesTallied";
        break;
    }
    return (
      <h5 color="primary">
        Workflow Status = {label} ({workflowStatus})
      </h5>
    );
  };

  const renderWorkflowButtons = () => {
    let buttonLabel = "Status du contrat inconnu !";
    let status = parseInt(workflowStatus);
    switch (status) {
      case 0:
        buttonLabel = "Démarrer la session d'enregistrement des propositions";
        break;
      case 1:
        buttonLabel = "Terminer la session d'enregistrement des propositions";
        break;
      case 2:
        buttonLabel = "Démarrer la session de votes";
        break;
      case 3:
        buttonLabel = "Terminer la session de votes";
        break;
      case 4:
        buttonLabel = "Compter les votes";
        break;
    }
    if (status == 5) {
      return <h5>Vote terminé</h5>;
    } else if (contractInfo.isOwner) {
      return (
        <div>
          <button
            onClick={nextWorkflow}
            className="btn btn-primary"
            display="flex"
          >
            {buttonLabel}
          </button>
        </div>
      );
    } else {
      return;
    }
  };

  const renderVoterRegistration = () => {
    if (parseInt(workflowStatus) === 0) {
      if (contractInfo.isOwner) {
        return (
          <div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Card style={{ width: "50rem" }}>
                <Card.Header>
                  <strong>Liste des électeurs enregistrés</strong>
                </Card.Header>
                <Card.Body>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>@</th>
                          </tr>
                        </thead>
                        <tbody>
                          {whitelist !== null &&
                            whitelist.map((a) => (
                              <tr key={a}>
                                <td>{a}</td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Card style={{ width: "50rem" }}>
                <Card.Header>
                  <strong>Enregistrer un nouvel électeur</strong>
                </Card.Header>
                <Card.Body>
                  <Form.Group>
                    <Form.Control
                      type="text"
                      id="address"
                      ref={inputNewVoter}
                    />
                  </Form.Group>
                  <button
                    className="btn btn-primary"
                    onClick={addVoter}
                    variant="contained"
                    color="primary"
                  >
                    Enregistrer
                  </button>
                </Card.Body>
              </Card>
            </div>
          </div>
        );
      } else {
        return (
          <h3>
            Veuillez attendre la fin de l'enregistrement des électeurs ...
          </h3>
        );
      }
    } else {
      return <div></div>;
    }
  };

  const renderVotingSession = () => {
    let status = parseInt(workflowStatus);
    return (
      <div>
        {status === 3 && !contractInfo.isOwner && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Card style={{ width: "50rem" }}>
              <Card.Header>
                <strong>Voter pour la proposition</strong>
              </Card.Header>
              <Card.Body>
                <Form.Group>
                  <Form.Control
                    type="number"
                    id="voteId"
                    min={0}
                    max={proposals.length - 1}
                    ref={inputVotedProposal}
                  />
                </Form.Group>
                <button onClick={vote} className="btn btn-primary">
                  Voter
                </button>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderVotesTallied = () => {
    let status = parseInt(workflowStatus);
    if (status === 5) {
      return <h5>Proposition gagnante: {winningProposal.description}</h5>;
    }
  };

  const renderProposalsRegistration = () => {
    let status = parseInt(workflowStatus);
    return (
      <div>
        {status > 0 && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Card style={{ width: "50rem" }}>
              <Card.Header>
                <strong>Liste des propositions</strong>
              </Card.Header>
              <Card.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Table striped bordered hover>
                      <tbody>
                        {proposals !== null &&
                          proposals.map((p, i) => (
                            <tr key={i}>
                              <td>{i + ":" + p.description} </td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                </ListGroup>
              </Card.Body>
            </Card>
          </div>
        )}
        <br></br>
        {status === 1 && !contractInfo.isOwner && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Card style={{ width: "50rem" }}>
              <Card.Header>
                <strong>Enregistrer une nouvelle proposition</strong>
              </Card.Header>
              <Card.Body>
                <Form.Group>
                  <Form.Control
                    type="text"
                    id="proposalDescription"
                    ref={inputNewProposal}
                  />
                </Form.Group>
                <button onClick={addProposal} className="btn btn-primary">
                  Enregistrer
                </button>
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <h6>Dapp de vote</h6>
      <div className="container">
        <div>
          Connecté : {contractInfo.accounts && contractInfo.accounts[0]}
        </div>
        {contractInfo.isOwner && <div>Administrateur</div>}

        {renderWorklfowStatus()}
        {renderWorkflowButtons()}

        {renderVoterRegistration()}
        {renderProposalsRegistration()}
        {renderVotingSession()}
        {renderVotesTallied()}
      </div>
    </div>
  );
}

export default App;
