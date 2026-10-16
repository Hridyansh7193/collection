# CollectPulse — Multi-Group Money Collection Platform

A complete, full-stack money collection platform built with **Node.js, Express, Razorpay / UPI QR integration, and Gmail SMTP** for sending automatic receipt emails.

---

## 🌟 Key Features

1. **10 Distinct Groups (A through J)**:
   - Each group has its own unique security password.
   - Collectors can only unlock and feed amounts into their designated group.
   - Live analytics for each group (Total Collected, Successful Count, Contributor Ledger).

2. **Collector Terminal (Dial-in Workflow)**:
   - The collector feeds the contribution amount in INR (with quick denomination chips: +₹100, +₹500, +₹1,000, +₹2,000, +₹5,000).
   - The collector dials in the **contributor's email address** (and optional name/phone/notes).
   - Generates an instant high-resolution dynamic **UPI / Razorpay QR Code**.

3. **Payment Gateway Integration (Razorpay & Dynamic UPI)**:
   - Compatible with all Indian UPI Apps (**Google Pay, PhonePe, Paytm, BHIM, Cred**).
   - Seamlessly generates dynamic NPCI UPI QR payloads (`upi://pay?pa=...&pn=...&am=...&cu=INR&tr=...`).
   - Supports Razorpay Orders and Checkout modal if `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are provided.
   - Includes a **Simulate Successful Payment** button right on the QR modal to test payment confirmation and real email delivery without bank debit.

4. **Automated Confirmation Email (via Gmail SMTP)**:
   - Sends an official, beautifully styled HTML receipt from your Gmail address.
   - Prominently displays:
     - Exact confirmation amount paid (e.g. `₹1,250.00`)
     - Unique Receipt ID (`TXN-A-20261016-XXXXX`)
     - Group Name & Contributor Details
     - Date & Timestamp
     - Contribution Note / Purpose
     - Status: **PAID & VERIFIED**

---

## 🔐 Group Passwords Reference

Each group is configured with a distinct password in [config.js](file:///c:/Users/hridy/Desktop/collection/config.js) and [.env](file:///c:/Users/hridy/Desktop/collection/.env):

| Group | Group Title | Default Password |
|---|---|---|
| **Group A** | Group A (Alpha) | `alpha@groupA` |
| **Group B** | Group B (Bravo) | `bravo@groupB` |
| **Group C** | Group C (Charlie) | `charlie@groupC` |
| **Group D** | Group D (Delta) | `delta@groupD` |
| **Group E** | Group E (Echo) | `echo@groupE` |
| **Group F** | Group F (Foxtrot) | `foxtrot@groupF` |
| **Group G** | Group G (Golf) | `golf@groupG` |
| **Group H** | Group H (Hotel) | `hotel@groupH` |
| **Group I** | Group I (India) | `india@groupI` |
| **Group J** | Group J (Juliet) | `juliet@groupJ` |

*(You can also customize these passwords inside `.env` or click the **"Group Passwords"** button in the top navigation bar).*

---

## 📧 How to Setup Gmail for Confirmation Emails

To let the platform send emails from your personal or organization Gmail:

1. Enable **2-Step Verification** on your Google Account:
   - Go to [Google Account Security](https://myaccount.google.com/security).
2. Generate an **App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
   - Select App name: e.g. `CollectionPlatform`.
   - Copy the generated 16-character password (e.g. `abcd efgh ijkl mnop`).
3. Add it to [.env](file:///c:/Users/hridy/Desktop/collection/.env) or via the in-app **Settings** modal:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-password
   ```

---

## 💳 How to Setup Razorpay (Optional)

1. Sign up or log into [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Account & Settings > API Keys** and generate Test or Live Keys.
3. Put them in [.env](file:///c:/Users/hridy/Desktop/collection/.env) or via the **Settings** modal:
   ```env
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=your_secret...
   ```
*(Note: If left blank, the app operates in Dynamic UPI QR mode and Simulation mode, which works out-of-the-box!)*

---

## 🚀 Running the Application

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
