// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "@openzeppelin/contracts/access/Ownable.sol";

/**  
* @title A voting contract
* @author Liam Coyle
* @notice You can use this contract for only one vote
*/

contract Voting is Ownable {

    // arrays for draw, uint for single
    uint[] winningProposalsID;
    Proposal[] winningProposals;
    
    uint winningProposalID;
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    enum  WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public workflowStatus;
    Proposal[] public proposalsArray;
    mapping (address => Voter) private voters;
    address[] private whitelistArray;

    /**
    * @notice voter is registered
    * @param voterAddress adress of voter
    */
    event VoterRegistered(address voterAddress); 

    
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);

    modifier onlyVoters() {
        require(voters[msg.sender].isRegistered, "You're not a voter");
        _;
    }
    
    // on peut faire un modifier pour les états

    // ::::::::::::: GETTERS ::::::::::::: //

    /**
     * @dev get voter
     * @param _addr adress of voter
     * @return voter by adress
     */
    function getVoter(address _addr) external onlyVoters view returns (Voter memory) {
        return voters[_addr];
    }

    /**
     * @dev get proposal by index
     * @return a Proposal
     */
    function getOneProposal(uint _id) external view returns (Proposal memory) {
        return proposalsArray[_id];
    }

    /**
     * @dev get all porposals
     * @return Proposals
     */
    function getProposals() external view returns (Proposal[] memory) {
        return proposalsArray;
    }

    /**
     * @notice Permet de récupérer la liste des voter.
     */
    function getWhitelist() external view returns (address[] memory){
        return whitelistArray;
    }

    // ne pas tester
    function getWinners() external view returns (Proposal[] memory) {
        require(workflowStatus == WorkflowStatus.VotesTallied, 'Votes are not tallied yet');
        return winningProposals; // return proposalsArray[winningProposalID];
    }

    /**
     * @dev get winner
     * @return winning Proposal
     */
    function getWinner() external view returns (Proposal memory) {
        require(workflowStatus == WorkflowStatus.VotesTallied, 'Votes are not tallied yet');
        return proposalsArray[winningProposalID];
    }
 
    // ::::::::::::: REGISTRATION ::::::::::::: // 

    /**
     * @dev add a new Voter
     * @param _addr adrress of voter
     */

    function addVoter(address _addr) external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet');
        require(voters[_addr].isRegistered != true, 'Already registered');
        whitelistArray.push(_addr);
        voters[_addr].isRegistered = true;

        emit VoterRegistered(_addr);
    }
 
    /* facultatif
     * function deleteVoter(address _addr) external onlyOwner {
     *   require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Voters registration is not open yet');
     *   require(voters[_addr].isRegistered == true, 'Not registered.');
     *   voters[_addr].isRegistered = false;
     *  emit VoterRegistered(_addr);
    }*/

    // ::::::::::::: PROPOSAL ::::::::::::: // 

    /**
     * @dev add a new Proposal
     * @param _desc description of voter
     */

    function addProposal(string memory _desc) external onlyVoters {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Proposals are not allowed yet');
        require(keccak256(abi.encode(_desc)) != keccak256(abi.encode("")), 'Vous ne pouvez pas ne rien proposer'); // facultatif
        // voir que desc est different des autres

        Proposal memory proposal;
        proposal.description = _desc;
        proposalsArray.push(proposal);
        emit ProposalRegistered(proposalsArray.length-1);
    }

    // ::::::::::::: VOTE ::::::::::::: //



    /**
     * @dev vote for a proposal, emit Voted
     * @param _id id of proposal
     */

    function setVote( uint _id) external onlyVoters {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        require(voters[msg.sender].hasVoted != true, 'You have already voted');
        require(_id <= proposalsArray.length, 'Proposal not found'); // pas obligé, et pas besoin du >0 car uint

        voters[msg.sender].votedProposalId = _id;
        voters[msg.sender].hasVoted = true;
        proposalsArray[_id].voteCount++;

        emit Voted(msg.sender, _id);
    }

    // ::::::::::::: STATE ::::::::::::: //

    /* on pourrait factoriser tout ça: par exemple:
    *  function setWorkflowStatus(WorkflowStatus _num) public onlyOwner {
    *    WorkflowStatus pnum = workflowStatus;
    *    workflowStatus = _num;
    *    emit WorkflowStatusChange(pnum, workflowStatus);
        } */ 


    function startProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, 'Registering proposals cant be started now');
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    function endProposalsRegistering() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, 'Registering proposals havent started yet');
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, 'Registering proposals phase is not finished');
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, 'Voting session havent started yet');
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    // ne pas tester
    function tallyVotesDraw() external onlyOwner {
       require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Current status is not voting session ended");
        uint highestCount;
        uint[5] memory winners; // egalite entre 5 proposals max
        uint nbWinners;
        for (uint i = 0; i < proposalsArray.length; i++) {
            if (nbWinners<5){
                if (proposalsArray[i].voteCount == highestCount) {
                    winners[nbWinners]=i;
                    nbWinners++;
                }
                if (proposalsArray[i].voteCount > highestCount) {
                    delete winners;
                    winners[0]= i;
                    highestCount = proposalsArray[i].voteCount;
                    nbWinners=1;
                }
            }
        }
        for(uint j=0;j<nbWinners;j++){
            winningProposalsID.push(winners[j]);
            winningProposals.push(proposalsArray[winners[j]]);
        }
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }

    /**
     * @dev count the votes, sets the winning id in _winningProposalId
     */
    function tallyVotes() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Current status is not voting session ended");
        uint _winningProposalId;
        for (uint256 p = 0; p < proposalsArray.length; p++) {
            if (proposalsArray[p].voteCount > proposalsArray[_winningProposalId].voteCount) {
                _winningProposalId = p;
            }
        }
        winningProposalID = _winningProposalId;
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
}