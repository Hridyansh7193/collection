# CollectPulse — Private Group Money Collection Platform

A clean, full-stack money collection web platform with dynamic UPI/Razorpay QR code generation and automated Gmail confirmation receipts.

---

## 🔒 Security & Privacy Features

1. **Private Ledgers**:
   - Financial ledgers and transaction histories are **never exposed on the public website**.
   - All transactions (amounts, timestamps, contributor emails, group IDs, transaction references, payment statuses) are stored strictly inside the backend database (`database.json`).

2. **Secret Group Passwords (Groups A through J)**:
   - There are 10 distinct groups (**Group A to Group J**).
   - Passwords are **never displayed on the website**.
   - The admin configures group passwords in `.env` and personally distributes the respective password to each group's collector.
   - A collector must select their group and enter the correct password to unlock the collection terminal.

3. **No Public Settings / Admin Lock**:
   - No settings panel exists on the frontend.
   - All credentials (Gmail user, App Password, Razorpay API keys, and group passwords) are managed exclusively by the admin in `.env`.

---

## 📧 How Confirmation Emails Work

When a contributor completes payment (or when the collector confirms payment), the platform automatically sends an official, branded HTML receipt directly to the **contributor's email address dialed in by the collector**.

### What the Email Contains
- **Exact amount confirmed** (e.g. `₹1,250.00`)
- **Official Receipt ID** (e.g. `TXN-A-20261016-XXXX`)
- **Allocated Group** (e.g. `Group A`)
- **Contributor Name and Email**
- **Date & Timestamp**
- **Payment Method & Reference ID**
- **Payment Status Badge**: Verified & Confirmed

### How to Setup Gmail SMTP (3 Quick Steps)
1. **Enable 2-Step Verification** on your Google Account:
   - Visit [https://myaccount.google.com/security](https://myaccount.google.com/security) and ensure 2-Step Verification is enabled.
2. **Generate a 16-character Google App Password**:
   - Go directly to: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
   - In the App name field, enter `CollectionPlatform` and click **Create**.
   - Google will show a 16-letter password (e.g., `abcd efgh ijkl mnop`).
3. **Add credentials to `.env`**:
   Open [.env](file:///c:/Users/hridy/Desktop/collection/.env) on your server and enter:
   ```env
   GMAIL_USER=your-actual-email@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   SENDER_NAME="Contribution Portal"
   ```
   *That's it! As soon as this is set, Nodemailer will send real emails instantly.*

---

## 💳 How to Setup the Razorpay Payment Gateway

The platform supports two payment methods:

### Option A: Standard Dynamic UPI QR (Works Out-of-the-Box)
- You don't need Razorpay keys to start collecting!
- In [.env](file:///c:/Users/hridy/Desktop/collection/.env), simply configure your UPI ID:
  ```env
  DEFAULT_UPI_ID=yourname@okaxis
  DEFAULT_MERCHANT_NAME="Community Contribution"
  ```
- The platform generates a dynamic NPCI-compliant UPI QR code for the exact amount.
- Any UPI app (**Google Pay, PhonePe, Paytm, BHIM, Cred**) scans this QR code, automatically pre-filling the exact amount and reference ID.

### Option B: Razorpay Payment Gateway (Cards, Netbanking & UPI)
If you want to use Razorpay's official merchant payment gateway:

1. **Sign up or log in** to the [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. **Get your API Keys**:
   - Go to **Account & Settings > API Keys** (left sidebar).
   - For testing: Make sure the dashboard toggle is in **Test Mode**, then click **Generate Test Key**.
   - For live money: Complete KYC on Razorpay, switch to **Live Mode**, and generate **Live Key**.
   - You will receive a **Key ID** (`rzp_test_...` or `rzp_live_...`) and a **Key Secret**.
3. **Add keys to `.env`**:
   ```env
   RAZORPAY_KEY_ID=rzp_test_YourKeyIdHere
   RAZORPAY_KEY_SECRET=YourSecretKeyHere
   ```
4. **Restart the server**:
   ```bash
   npm start
   ```
- With Razorpay keys configured, the platform automatically creates verified Razorpay Orders, generates dynamic payment QRs, and provides the Razorpay Checkout modal for credit/debit cards and netbanking.

---

## 🔐 Managing Group Passwords

Set secret passwords for each group in `.env`:

```env
GROUP_A_PASS=yourSecretA
GROUP_B_PASS=yourSecretB
GROUP_C_PASS=yourSecretC
GROUP_D_PASS=yourSecretD
GROUP_E_PASS=yourSecretE
GROUP_F_PASS=yourSecretF
GROUP_G_PASS=yourSecretG
GROUP_H_PASS=yourSecretH
GROUP_I_PASS=yourSecretI
GROUP_J_PASS=yourSecretJ
```

Send the respective password directly and privately to the collector for each group.

---

## 🚀 Running the Server

```bash
# Start server
npm start

# Or with automatic reload on changes
npm run dev
```

Open your browser at:
`http://localhost:3000`
