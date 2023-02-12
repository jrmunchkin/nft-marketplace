// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error IsaacNft__NoMoreFreeNft();
error IsaacNft__NotEnoughETH();
error IsaacNft__RangeOutOfBound();

/**
 * @title IsaacNft
 * @author jrmunchkin
 * @notice This contract creates a NFT collection on the theme of The binding of Isaac.
 * Isaac characters are sort regarding the rarity from Legendary to Common. The chance to get a character or another is based on randomness + the percentage of the rarity.
 * The contract allow each user to mint a maximum of 3 NFTs.
 * @dev The constructor takes a mint fee in ETH and an array of token uris for each characters.
 * This contract implements Chainlink VRF to pick a random rarity and character.
 */
contract IsaacNft is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    enum Legendary {
        THELOST
    }

    enum Rare {
        ISAAC,
        AZAZEL,
        QUESTION
    }

    enum Common {
        MAGDALENE,
        CAIN,
        JUDAS,
        EVE,
        SAMSON,
        EDEN,
        LAZARUS
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 private constant MAX_CHANCE_VALUE = 100;
    uint256 private s_tokenCounter;
    string[][3] private s_isaacTokenUris;
    uint256 private s_mintFee;
    mapping(uint256 => address) private s_requestIdToSender;
    mapping(address => uint256) private s_userFreeNft;

    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(uint256 rarity, uint256 character, address indexed minter);

    /**
     * @notice contructor
     * @param _vrfCoordinatorV2 VRF Coordinator contract address
     * @param _subscriptionId Subscription Id of Chainlink VRF
     * @param _gasLane Gas lane of Chainlink VRF
     * @param _callbackGasLimit Callback gas limit of Chainlink VRF
     * @param _isaacTokenUris Array of the token uris of each characters
     * @param _mintFee Fee vato mint an NFT in ETH
     */
    constructor(
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit,
        string[][3] memory _isaacTokenUris,
        uint256 _mintFee
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) ERC721("Isaac", "ISC") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_subscriptionId = _subscriptionId;
        i_gasLane = _gasLane;
        i_callbackGasLimit = _callbackGasLimit;
        s_tokenCounter = 0;
        s_isaacTokenUris = _isaacTokenUris;
        s_mintFee = _mintFee;
    }

    /**
     * @notice Allow user to mint a free NFT without the mint fees (limit of 3 by user)
     */
    function mintFreeNft() external {
        if (s_userFreeNft[msg.sender] >= 3) revert IsaacNft__NoMoreFreeNft();
        requestNft();
        s_userFreeNft[msg.sender]++;
    }

    /**
     * @notice Allow user to mint an NFT by paying the mint fees
     */
    function mintNft() external payable {
        if (msg.value < s_mintFee) revert IsaacNft__NotEnoughETH();
        requestNft();
    }

    /**
     * @notice Send a request to the chainlink VRF to get a random number to decide wich NFT the user will get.
     * @dev Call Chainlink VRF to request a random NFT
     * emit an event NftRequested when request NFT is called
     */
    function requestNft() internal {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NftRequested(requestId, msg.sender);
    }

    /**
     * @notice Picked a random NFT
     * @dev Call by the Chainlink VRF after requesting a random NFT
     * emit an event NftMinted when random NFT has been minted
     */
    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        address requester = s_requestIdToSender[_requestId];
        uint256 newTokenId = s_tokenCounter;

        (uint256 rarity, uint256 character) = getRandomCharacter(
            _randomWords[0]
        );
        s_tokenCounter++;
        _safeMint(requester, newTokenId);
        _setTokenURI(newTokenId, s_isaacTokenUris[rarity][character]);
        emit NftMinted(rarity, character, requester);
    }

    /**
     * @notice Get a random character by first determine the rarity
     * @param _randomWord the random number to get the rarity and character
     * @return rarity the rarity of the character
     * @return character the character
     */
    function getRandomCharacter(
        uint256 _randomWord
    ) public pure returns (uint256, uint256) {
        uint256 moddedRng = _randomWord % MAX_CHANCE_VALUE;
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
                return (i, getRandomCharacterfromRarity(_randomWord, i));
            }
            cumulativeSum = chanceArray[i];
        }

        revert IsaacNft__RangeOutOfBound();
    }

    /**
     * @notice Get a random character from teh rarity
     * @param _randomWord the random number to get the rarity and character
     * @param _indexRarity the rarity of the character
     * @return character the character
     */
    function getRandomCharacterfromRarity(
        uint256 _randomWord,
        uint256 _indexRarity
    ) internal pure returns (uint256) {
        if (_indexRarity == 0)
            return
                uint256(
                    Legendary(_randomWord % (uint256(Legendary.THELOST) + 1))
                );
        if (_indexRarity == 1)
            return uint256(Rare(_randomWord % (uint256(Rare.QUESTION) + 1)));
        if (_indexRarity == 2)
            return uint256(Common(_randomWord % (uint256(Common.LAZARUS) + 1)));

        revert IsaacNft__RangeOutOfBound();
    }

    /**
     * @notice Get the chance array which help to determine the percentage of the rarity
     * @return chanceArray the character
     */
    function getChanceArray() internal pure returns (uint256[3] memory) {
        return [5, 40, MAX_CHANCE_VALUE];
    }

    /**
     * @notice Get the mint fee to mint an NFT
     * @return mintFee The mint fee
     */
    function getMintFee() external view returns (uint256) {
        return s_mintFee;
    }

    /**
     * @notice Get the token uri thanks to the rarity and the index of the character
     * @param _rarity The rarity of the character
     * @param _index The index of the character
     * @return tokenUris The token uri
     */
    function getIsaacTokenUri(
        uint256 _rarity,
        uint256 _index
    ) external view returns (string memory) {
        return s_isaacTokenUris[_rarity][_index];
    }

    /**
     * @notice Get the last token id
     * @return tokenId The token id
     */
    function getTokenCounter() external view returns (uint256) {
        return s_tokenCounter;
    }

    /**
     * @notice Get the number of free NFTs already minted for a specific user
     * @param _user The user address
     * @return nbFreeNft The number of free NFT already minted
     */
    function getNbUserFreeNft(address _user) external view returns (uint256) {
        return s_userFreeNft[_user];
    }
}
