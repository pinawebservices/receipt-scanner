# Receipt Scanner - Proof of Concept

A Next.js app that uses OpenAI's GPT-4o Vision API to parse receipt images and extract items, prices, and totals which will be used to help split restaurant bills per person.

## Project Overview
Receipt scanning app using Next.js + OpenAI GPT-4o Vision

## Roadmap
### Phase 1 - Free Web App (Current)
- [x] Scan receipt and extract items
- [ ] Add person names to items
- [ ] Calculate how much each person owes
- [ ] Calculate tax and tip % from totals
### Phase 2 - Mobile App
### Phase 3 - Multi-currency

## Features

- Upload receipt images (JPG, PNG, etc.)
- Automatically extract line items with prices
- Parse subtotal, tax, tip, and total amounts
- Display structured receipt data
- Works with various receipt formats

## Tech Stack

- **Next.js** - React framework with API routes
- **OpenAI GPT-4o Vision** - Image analysis and receipt parsing
- No OCR library needed - GPT-4o reads the image directly

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure OpenAI API Key

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
3. Edit `.env.local` and add your API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. Click "Choose File" and select a receipt image
2. Click "Scan Receipt"
3. Wait a few seconds for GPT-4o to analyze the image
4. View the parsed items and totals

## Cost Estimate

- Typical cost per receipt: **~$0.005** (half a cent)
- Processing 100 receipts: ~$0.50
- Processing 1,000 receipts: ~$5.00

## Project Structure

```
receipt-scanner/
├── pages/
│   ├── index.js              # Main receipt upload page
│   └── api/
│       └── parse-receipt.js  # API route that calls OpenAI
├── package.json
├── .env.local.example        # Template for environment variables
└── README.md
```

## API Route Details

The `/api/parse-receipt` endpoint:
1. Receives base64-encoded image from frontend
2. Sends image to OpenAI GPT-4o Vision API
3. Prompts GPT-4o to return structured JSON
4. Returns parsed receipt data to frontend

## Next Steps (Phase 1 Features)

- [ ] Add person name assignment to items
- [ ] Calculate how much each person owes
- [ ] Calculate tax and tip percentages
- [ ] Add ability to manually edit parsed items
- [ ] Improve UI/UX with better styling
- [ ] Add receipt storage (database)
- [ ] Handle edge cases and errors better

## Deployment

This app can be deployed to Vercel (free tier):

```bash
npm install -g vercel
vercel
```

Remember to add your `OPENAI_API_KEY` in the Vercel dashboard under Settings → Environment Variables.

## Troubleshooting

**"OpenAI API key not configured" error:**
- Make sure you created `.env.local` (not `.env.local.example`)
- Restart the dev server after adding the API key

**Receipt not parsing correctly:**
- Ensure the image is clear and well-lit
- Try a different receipt image
- Check the raw JSON response for what GPT-4o extracted

**API costs too high:**
- Consider switching to Tesseract.js + GPT-4o text model (cheaper)
- Resize images before sending (smaller = cheaper)
- Cache results for the same receipt

## License

MIT
