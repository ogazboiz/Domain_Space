# Domain Space

A unified domain marketplace platform that combines XMTP messaging with Doma Protocol for instant domain trading and communication. Built for the DoraHacks DomainFi Hackathon Track 5.

## The Problem

Domain trading is broken. Deals take weeks through email chains. Escrow services add delays. Buyers and sellers have no transparency. Communication happens through third parties. The process frustrates everyone involved.

## The Solution

Domain Space fixes domain trading. You connect your wallet, browse domains, and trade instantly. XMTP handles messaging. Doma Protocol handles settlement. Everything happens in one place with full transparency.

## Core Features

### Instant Messaging System
- XMTP-powered chat with domain owners
- End-to-end encrypted conversations
- Real-time message delivery
- File uploads with Cloudinary integration
- Emoji reactions with on-chain storage
- Mobile-optimized fullscreen chat experience
- Conversation history persistence
- Copy wallet addresses directly from chat

### Domain Trading Engine
- Buy domains at listed prices instantly
- Make custom offers to negotiate
- Direct domain-to-domain exchange within chat
- Real-time price display on domain cards
- Instant settlement through Doma Protocol
- No escrow delays or third-party fees
- Transparent offer visibility

### Portfolio Management
- Track all owned domains
- Watchlist domains you want to buy
- Get notifications when watched domains change
- List domains for sale with custom pricing
- Cancel listings instantly
- View transaction history
- Monitor domain performance

### Advanced Search & Discovery
- Search domains by name across all TLDs
- Filter by TLD, price range, listing status
- Domain search within chat interface
- Click any domain for detailed information
- View owner details and expiration dates
- See all active offers and bids

### Mobile-First Experience
- Fullscreen chat mode for mobile devices
- Touch-optimized interface design
- Clean navigation with disappearing hamburger menu
- Responsive grid layouts
- Mobile-specific domain interaction flows
- XMTP eligibility checks on mobile
- Optimized file upload on mobile

### Single-Page Architecture
- No page reloads or navigation delays
- Modal-based domain details
- Overlay chat system
- Fullscreen mode with React portals
- Tab-based navigation
- Instant state management

## Technical Implementation

### Frontend Stack
- Next.js 15 with App Router for server-side rendering
- React 18 with hooks and context for state management
- TypeScript for type safety and development experience
- Tailwind CSS for responsive styling
- Framer Motion for smooth animations

### Messaging Infrastructure
- XMTP browser SDK for decentralized messaging
- Content type support for text, reactions, and attachments
- Remote attachment codec for file handling
- Cloudinary integration for file storage
- End-to-end encryption for all communications

### Domain Trading
- Doma Protocol SDK for domain operations
- Orderbook integration for real-time pricing
- Wallet integration with wagmi
- Multi-chain support for different networks
- Transaction state management

### File Handling
- Cloudinary upload service for attachments
- XMTP encryption for file security
- Support for images, documents, and media
- Automatic file type detection
- Download functionality for received files

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Wallet with testnet ETH for testing

### Installation

Clone the repository:
```bash
git clone https://github.com/your-username/domain-space.git
cd domain-space
```

Install dependencies:
```bash
npm install
```

### Environment Setup

Create environment file:
```bash
cp .env.example .env.local
```

Configure required environment variables:
```bash
# XMTP Configuration
NEXT_PUBLIC_XMTP_ENV=dev
NEXT_PUBLIC_XMTP_APP_VERSION=1.0.0

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Doma Protocol Configuration
NEXT_PUBLIC_DOMA_RPC_URL=your_rpc_url
NEXT_PUBLIC_DOMA_CHAIN_ID=your_chain_id

# Wallet Configuration
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

### Development Server

Start the development server:
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Production Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── chat/              # XMTP chat components
│   │   ├── ImprovedXMTPChat.tsx
│   │   ├── FileUploadButton.tsx
│   │   └── AttachmentDisplay.tsx
│   ├── ui/                # Reusable UI components
│   │   ├── ChatAvatar.tsx
│   │   └── DomainAvatar.tsx
│   ├── DomainCard.tsx     # Domain display component
│   ├── DomainMarketplace.tsx # Main marketplace
│   ├── TradeOptionsModal.tsx # Trading interface
│   └── ...                # Other feature components
├── contexts/              # React contexts
│   ├── XMTPContext.tsx    # XMTP client management
│   └── UsernameContext.tsx # User state management
├── hooks/                 # Custom hooks
│   ├── use-doma.ts        # Doma Protocol hooks
│   ├── use-orderbook.ts   # Orderbook hooks
│   └── useReactions.ts    # Reaction management
├── services/              # API services
│   ├── cloudinary-upload.ts
│   └── xmtp-attachment.ts
├── types/                 # TypeScript types
│   └── doma.ts           # Domain data types
└── utils/                 # Utility functions
```

## Usage Guide

### Connecting Your Wallet
1. Click "Connect Wallet" in the header
2. Select your preferred wallet provider
3. Approve the connection request
4. Your wallet address appears in the header

### Browsing Domains
1. Use the search bar to find specific domains
2. Apply filters for TLD, price, or status
3. Click any domain card to view details
4. Use fullscreen mode to see more domains

### Messaging Domain Owners
1. Click "Message" on any domain card
2. XMTP checks if the owner supports messaging
3. Start a conversation if eligible
4. Send text messages, files, or emoji reactions
5. Use the Exchange button to propose trades

### Trading Domains
1. For listed domains: Click "Buy" for instant purchase
2. For unlisted domains: Click "Offer" to negotiate
3. In chat: Click "Exchange" for domain-to-domain trades
4. Confirm transactions in your wallet
5. Domains transfer instantly upon confirmation

### Managing Your Portfolio
1. Switch to "My Space" tab
2. View owned domains in "Owned" section
3. Add domains to watchlist in "Watched" section
4. List domains for sale with custom pricing
5. Cancel listings when needed

## API Integration

### XMTP Messaging
- Decentralized messaging protocol
- End-to-end encryption
- Content type support for rich messages
- Cross-platform compatibility

### Doma Protocol
- On-chain domain tokenization
- Orderbook integration
- Multi-chain support
- Instant settlement

### Cloudinary
- File upload and storage
- Image optimization
- Secure file delivery
- Automatic format conversion

## Mobile Optimization

### Responsive Design
- Mobile-first approach
- Touch-optimized interactions
- Fullscreen chat mode
- Adaptive grid layouts

### Performance
- Optimized bundle size
- Lazy loading for images
- Efficient state management
- Fast navigation

## Security Features

### Wallet Security
- No private key storage
- Wallet-based authentication
- Transaction signing required
- Multi-wallet support

### Message Security
- End-to-end encryption
- No message storage on servers
- Decentralized message delivery
- User-controlled data

### File Security
- Encrypted file uploads
- Secure file storage
- Access control
- Automatic cleanup

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push
4. Custom domain setup available

### Environment Variables
Ensure all required environment variables are set in production:
- XMTP configuration
- Cloudinary credentials
- Doma Protocol settings
- Wallet Connect project ID

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License. See LICENSE file for details.

## Support

For questions or issues:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

## Live Demo

Visit the live application at domain-space.vercel.app

Built for DoraHacks DomainFi Hackathon Track 5: Landing Pages & Messaging Interfaces