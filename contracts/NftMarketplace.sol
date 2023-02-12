// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(
    address nftAddress,
    uint256 tokenId,
    uint256 price
);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

/**
 * @title NftMarketplace
 * @author jrmunchkin
 * @notice This contract creates a NFT marketplace where any Nft collection can be listed or bought
 * Every user can withdraw the ETH from their sold NFT.
 */
contract NftMarketplace {
    struct Listing {
        uint256 price;
        address seller;
    }
    mapping(address => mapping(uint256 => Listing)) private s_listings;
    mapping(address => uint256) private s_proceeds;

    event NftListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event NftBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event NftCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    event ProceedsWithdraw(address indexed seller, uint256 amount);

    /**
     * @notice Modifier to check that the NFT has not been already listed
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     */
    modifier notListed(address _nftAddress, uint256 _tokenId) {
        Listing memory listing = s_listings[_nftAddress][_tokenId];
        if (listing.price > 0)
            revert NftMarketplace__AlreadyListed(_nftAddress, _tokenId);
        _;
    }

    /**
     * @notice Modifier to check that the NFT belongs to the spender
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     * @param _spender User who wish to use the NFT
     */
    modifier isOwner(
        address _nftAddress,
        uint256 _tokenId,
        address _spender
    ) {
        IERC721 nft = IERC721(_nftAddress);
        address owner = nft.ownerOf(_tokenId);
        if (_spender != owner) revert NftMarketplace__NotOwner();
        _;
    }

    /**
     * @notice Modifier to check that the NFT has already been listed
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     */
    modifier isListed(address _nftAddress, uint256 _tokenId) {
        Listing memory listing = s_listings[_nftAddress][_tokenId];
        if (listing.price <= 0)
            revert NftMarketplace__NotListed(_nftAddress, _tokenId);
        _;
    }

    /**
     * @notice Allow user to list any NFT thanks to the NFT contract address and the token id
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     * @param _price Price the user wish to sell his NFT
     * @dev emit an event NftListed when the NFT has been listed
     * use modifier notListed to check that the NFT has not been already listed
     * use modifier isOwner to check that the NFT belongs to the user
     */
    function listNft(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _price
    )
        external
        notListed(_nftAddress, _tokenId)
        isOwner(_nftAddress, _tokenId, msg.sender)
    {
        if (_price <= 0) revert NftMarketplace__PriceMustBeAboveZero();
        IERC721 nft = IERC721(_nftAddress);
        if (nft.getApproved(_tokenId) != address(this))
            revert NftMarketplace__NotApprovedForMarketplace();
        s_listings[_nftAddress][_tokenId] = Listing(_price, msg.sender);
        emit NftListed(msg.sender, _nftAddress, _tokenId, _price);
    }

    /**
     * @notice Allow user to buy any NFT thanks to the NFT contract address and the token id
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     * @dev emit an event NftBought when the NFT has been bought
     * use modifier isListed to check that the NFT has already been listed
     */
    function buyNft(
        address _nftAddress,
        uint256 _tokenId
    ) external payable isListed(_nftAddress, _tokenId) {
        Listing memory listedItem = s_listings[_nftAddress][_tokenId];
        if (msg.value < listedItem.price)
            revert NftMarketplace__PriceNotMet(
                _nftAddress,
                _tokenId,
                listedItem.price
            );
        s_proceeds[listedItem.seller] =
            s_proceeds[listedItem.seller] +
            msg.value;
        delete (s_listings[_nftAddress][_tokenId]);
        IERC721(_nftAddress).safeTransferFrom(
            listedItem.seller,
            msg.sender,
            _tokenId
        );
        emit NftBought(msg.sender, _nftAddress, _tokenId, listedItem.price);
    }

    /**
     * @notice Allow user to cancel listing of any NFT thanks to the NFT contract address and the token id
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     * @dev emit an event NftCanceled when the NFT has been canceled
     * use modifier isOwner to check that the NFT belongs to the user
     * use modifier isListed to check that the NFT has already been listed
     */
    function cancelNftListing(
        address _nftAddress,
        uint256 _tokenId
    )
        external
        isOwner(_nftAddress, _tokenId, msg.sender)
        isListed(_nftAddress, _tokenId)
    {
        delete (s_listings[_nftAddress][_tokenId]);
        emit NftCanceled(msg.sender, _nftAddress, _tokenId);
    }

    /**
     * @notice Allow user to update listing of any NFT thanks to the NFT contract address and the token id
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     * @param _newPrice New price the user wish to sell his NFT
     * @dev emit an event NftListed when the NFT has been listed
     * use modifier isOwner to check that the NFT belongs to the user
     * use modifier isListed to check that the NFT has already been listed
     */
    function updateNftListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _newPrice
    )
        external
        isListed(_nftAddress, _tokenId)
        isOwner(_nftAddress, _tokenId, msg.sender)
    {
        if (_newPrice <= 0) revert NftMarketplace__PriceMustBeAboveZero();
        s_listings[_nftAddress][_tokenId].price = _newPrice;
        emit NftListed(msg.sender, _nftAddress, _tokenId, _newPrice);
    }

    /**
     * @notice Allow user to withdraw all the ETH of his sold NFT
     * @dev emit an event proceedsWithdraw when the ETH have been withdraw
     */
    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) revert NftMarketplace__NoProceeds();
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) revert NftMarketplace__TransferFailed();
        emit ProceedsWithdraw(msg.sender, proceeds);
    }

    /**
     * @notice Get the listing of any NFT thanks to the NFT contract address and the token id
     * @param _nftAddress Address of the NFT collection
     * @param _tokenId Token id of the NFT item
     * @return listing Listing of the NFT
     */
    function getListing(
        address _nftAddress,
        uint256 _tokenId
    ) external view returns (Listing memory) {
        return s_listings[_nftAddress][_tokenId];
    }

    /**
     * @notice Get the amount of proceeds of a specific user
     * @param _seller Address of the user
     * @return amount Amount to proceed
     */
    function getProceeds(address _seller) external view returns (uint256) {
        return s_proceeds[_seller];
    }
}
