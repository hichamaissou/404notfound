# 🚀 Redirect Watch - Deployment Guide

## **Quick Deploy to Vercel**

### 1. **Connect to Vercel**
```bash
# If not already connected
npx vercel login
npx vercel link
```

### 2. **Set Environment Variables**
In Vercel Dashboard → Settings → Environment Variables:

```env
# Required
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,write_online_store_navigation,read_content
SHOPIFY_APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your_secure_jwt_secret
CRON_SECRET=your_secure_cron_secret

# Optional
RESEND_API_KEY=your_resend_key
ALERTS_TO=admin@yourstore.com
BILLING_PLAN_NAME=Pro
BILLING_PRICE_AMOUNT=14.00
BILLING_CURRENCY=EUR
BILLING_TRIAL_DAYS=14
```

### 3. **Deploy**
```bash
npx vercel --prod
```

## **Database Setup (Supabase)**

### Option A: Use API Endpoint
```bash
curl https://your-app.vercel.app/api/debug/create-tables?key=setup
```

### Option B: Manual SQL
Run `scripts/migrate-to-uuid.sql` in Supabase SQL Editor.

## **Vercel Cron Configuration**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/scans/run",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## **Test the App**

### 1. **OAuth Flow**
Visit: `https://your-app.vercel.app?shop=your-shop.myshopify.com`

### 2. **Test Features**
- Dashboard: View KPIs and charts
- Scans: Queue a new site scan
- Rules: Create and test regex patterns
- Auto-fix: Generate AI suggestions

### 3. **Debug Endpoints**
- `/api/debug/config` - Check environment
- `/api/debug/db` - Test database connection
- `/api/test-db` - Simple DB test

## **Monitoring**

### **Check Job Status**
```bash
curl https://your-app.vercel.app/api/scans/status?shop=your-shop.myshopify.com
```

### **Manual Job Run**
```bash
curl -X POST https://your-app.vercel.app/api/scans/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## **Troubleshooting**

### **Build Issues**
- Check TypeScript errors: `npm run build`
- Verify all imports are correct
- Ensure environment variables are set

### **Database Issues**
- Verify `DATABASE_URL` is correct
- Check if tables exist: `/api/debug/db`
- Run migration if needed

### **OAuth Issues**
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
- Check `SHOPIFY_APP_URL` matches Vercel domain
- Ensure app is installed in Shopify Partners

## **Success Indicators**

✅ **Build**: `npm run build` completes without errors  
✅ **Deploy**: Vercel deployment succeeds  
✅ **Database**: `/api/debug/db` returns success  
✅ **OAuth**: App installs in Shopify Admin  
✅ **Features**: Dashboard loads with data  

## **Rolls-Royce Features Ready**

🎯 **Advanced Crawler** - Polite site scanning  
🤖 **AI Auto-fix** - Jaro-Winkler suggestions  
📊 **Analytics Dashboard** - KPIs and charts  
🎨 **Modern UI** - Polaris components  
⚙️ **Background Jobs** - Async processing  
🔧 **Regex Rules** - Pattern automation  

**Your Redirect Watch app is now enterprise-ready!** 🚀
