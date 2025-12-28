# 🌐 CORS Configuration - GDGC Platform

## ✅ Updated Configuration

The backend has been configured to accept requests from your frontend domain.

### **Allowed Origins:**
- ✅ `http://localhost:3000` (Local development)
- ✅ `http://localhost:5000` (Local backend)
- ✅ `https://www.gdgciare.tech` (Production frontend with www)
- ✅ `https://gdgciare.tech` (Production frontend without www)

### **Allowed Methods:**
- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS

### **Allowed Headers:**
- Content-Type
- Authorization

### **Credentials:**
- ✅ Enabled (cookies and auth headers will work)

---

## 🔧 What Was Changed

### 1. **Express CORS Configuration** (`src/app.js`)
```javascript
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5000',
        'https://www.gdgciare.tech',
        'https://gdgciare.tech'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 2. **Socket.IO CORS Configuration**
```javascript
const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:3000',
            'http://localhost:5000',
            'https://www.gdgciare.tech',
            'https://gdgciare.tech'
        ],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true
    }
});
```

---

## 🚀 How to Test

### **From Your Frontend (https://www.gdgciare.tech)**

1. **Test a simple POST request:**
```javascript
fetch('https://your-backend-url.com/api/events/create', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN'
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
        eventName: "Test Event",
        description: "Testing CORS",
        eventType: "workshop",
        date: "2025-10-15",
        status: "upcoming",
        imageUrl: "https://example.com/image.jpg",
        referenceUrl: ""
    })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

2. **Check Browser Console:**
   - No CORS errors should appear
   - Requests should complete successfully

3. **Check Network Tab:**
   - Status should be 200/201 for successful requests
   - Response headers should include:
     - `Access-Control-Allow-Origin: https://www.gdgciare.tech`
     - `Access-Control-Allow-Credentials: true`

---

## 🔍 Troubleshooting

### **If CORS errors still occur:**

1. **Restart your backend server:**
   ```bash
   npm start
   ```

2. **Check if your backend URL is correct:**
   - Make sure you're using the correct backend URL
   - Verify SSL certificate is valid (for HTTPS)

3. **Verify frontend is using correct protocol:**
   - Frontend: `https://www.gdgciare.tech`
   - Backend: Must also use `https://` if frontend is HTTPS

4. **Check browser console for specific CORS error:**
   - "No 'Access-Control-Allow-Origin' header" → Server not running or wrong URL
   - "Credentials flag is true" → Add `credentials: 'include'` to fetch
   - "Method not allowed" → Check if method is in allowed methods list

---

## 📝 Additional Notes

### **Adding More Domains:**
To add more allowed domains, update the `origin` array in both places:

```javascript
origin: [
    'http://localhost:3000',
    'https://www.gdgciare.tech',
    'https://gdgciare.tech',
    'https://new-domain.com'  // Add here
]
```

### **Environment-Based Configuration:**
For better management, you can use environment variables:

1. **Add to `.env`:**
   ```
   ALLOWED_ORIGINS=http://localhost:3000,https://www.gdgciare.tech,https://gdgciare.tech
   ```

2. **Update app.js:**
   ```javascript
   origin: process.env.ALLOWED_ORIGINS.split(',')
   ```

---

## ✅ Summary

- ✅ CORS is now configured for `https://www.gdgciare.tech`
- ✅ All HTTP methods (GET, POST, PUT, PATCH, DELETE) are allowed
- ✅ Credentials (cookies, auth headers) are enabled
- ✅ Socket.IO also configured with same CORS settings
- ✅ Both www and non-www versions are allowed

**Your frontend should now be able to make POST requests successfully!** 🎉
