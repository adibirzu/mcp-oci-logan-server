# Security Configuration Guide - OCI MCP Logan Server

## Overview

This guide ensures proper security configuration by using environment variables, configuration files, and avoiding hardcoded credentials in the OCI MCP Logan Server.

## 🔒 Security Best Practices

### 1. Environment Variables Configuration

**Create .env file (NEVER commit this file):**
```bash
cp .env.template .env
```

**Edit .env with your actual values:**
```bash
# Required: Your OCI Compartment ID
OCI_COMPARTMENT_ID=ocid1.compartment.oc1..aaaaaaaa[your-actual-compartment-id]

# Optional: Your OCI Region (defaults to us-ashburn-1)
OCI_REGION=eu-frankfurt-1

# Optional: Override defaults only if needed
# OCI_USER_ID=ocid1.user.oc1..aaaaaaaa[your-user-id]
# OCI_TENANCY_ID=ocid1.tenancy.oc1..aaaaaaaa[your-tenancy-id]
# OCI_FINGERPRINT=aa:bb:cc:dd:ee:ff:11:22:33:44:55:66:77:88:99:00
# OCI_KEY_FILE=/path/to/your/private/key.pem
```

### 2. OCI CLI Configuration (Recommended)

**Use OCI CLI for credentials (preferred method):**
```bash
# Configure OCI CLI with your credentials
oci setup config

# Test configuration
oci iam user get --user-id $(oci iam user list --query 'data[0].id' --raw-output)
```

This creates `~/.oci/config` with your authentication details.

### 3. Claude Desktop Configuration

**Copy template and customize:**
```bash
cp claude_desktop_config.json.template claude_desktop_config.json
```

**Edit paths and variables:**
```json
{
  "mcpServers": {
    "oci-logan": {
      "command": "node",
      "args": ["/full/path/to/YOUR/mcp-oci-logan-server/dist/index.js"],
      "env": {
        "OCI_COMPARTMENT_ID": "ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]",
        "OCI_REGION": "your-region"
      }
    }
  }
}
```

## 🛡️ What's Protected

### Files Never Committed to Git
- `.env` - Environment variables with actual values
- `claude_desktop_config.json` - Personal configuration
- `~/.oci/config` - OCI CLI configuration
- `*.pem`, `*.key` - Private keys
- `wallet_*/` - OCI Autonomous Database wallets
- Any files matching credentials patterns

### Files Safe to Commit
- `.env.template` - Template without actual values
- `claude_desktop_config.json.template` - Template configuration
- Source code with placeholder OCIDs
- Documentation with example values

## 🔍 OCID Format Examples

### Example OCIDs (Safe placeholders used in documentation)
```bash
# User OCID
ocid1.user.oc1..aaaaaaaa[your-user-id]

# Tenancy OCID  
ocid1.tenancy.oc1..aaaaaaaa[your-tenancy-id]

# Compartment OCID
ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]

# Dashboard OCID
ocid1.dashboard.oc1..aaaaaaaa[your-dashboard-id]
```

### Real OCIDs (Never commit these patterns)
```bash
# These patterns indicate REAL OCIDs - never commit:
ocid1.*.oc1..[40+ character string with no brackets]
```

## 🚫 What NOT to Do

### ❌ Never Hardcode
```javascript
// WRONG - Never do this
const compartmentId = 'ocid1.compartment.oc1..[real-40-character-ocid-string]';

// WRONG - Never commit real fingerprints
const fingerprint = 'ab:cd:ef:12:34:56:78:90:ab:cd:ef:12:34:56:78:90';
```

### ❌ Never Commit These Files
- Files with real OCIDs longer than examples
- Private key files (*.pem, *.key)  
- OCI wallet files
- Environment files with actual values
- Personal configuration files

## ✅ Correct Approach

### ✅ Use Environment Variables
```javascript
// CORRECT - Use environment variables
const compartmentId = process.env.OCI_COMPARTMENT_ID;
const region = process.env.OCI_REGION || 'us-ashburn-1';
```

### ✅ Use Configuration Templates
```javascript
// CORRECT - Use examples in documentation
const EXAMPLE_COMPARTMENT_ID = 'ocid1.compartment.oc1..aaaaaaaa[your-compartment-id]';
```

## 🔧 Configuration Hierarchy

The server uses this priority order for configuration:

1. **Environment Variables** (highest priority)
   - `OCI_COMPARTMENT_ID`
   - `OCI_REGION`
   - `OCI_USER_ID`, etc.

2. **OCI CLI Configuration** 
   - `~/.oci/config` file
   - Default profile or specified profile

3. **Instance Principal** (OCI compute only)
   - Automatically detected
   - No configuration needed

4. **Default Values** (lowest priority)
   - Built-in defaults
   - Example placeholders

## 🧪 Testing Security Configuration

### Verify No Hardcoded Values
```bash
# Check for real OCIDs in code
grep -r "ocid1\." . --exclude-dir=node_modules --exclude-dir=venv | grep -v "aaaaaaaa\[" | grep -v "example"

# Should return no results or only template files
```

### Verify Environment Variables
```bash
# Check environment is properly loaded
node -e "console.log('Compartment:', process.env.OCI_COMPARTMENT_ID || 'Not Set')"
node -e "console.log('Region:', process.env.OCI_REGION || 'Default')"
```

### Test Authentication
```bash
# Test OCI connection
node test-oci-direct.js

# Should show successful authentication
```

## 🚨 If You Accidentally Commit Credentials

### Immediate Actions
1. **Revoke the credentials immediately**
   - Delete the API key from OCI Console
   - Generate new key pair
   - Update configurations

2. **Remove from Git history**
   ```bash
   # Remove file from Git history (destructive)
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch path/to/file' \
   --prune-empty --tag-name-filter cat -- --all
   
   # Force push (warning: affects all clones)
   git push origin --force --all
   ```

3. **Update all configurations**
   - Generate new OCI API key
   - Update .env file
   - Test connections

## 📋 Security Checklist

Before committing code:

- [ ] No real OCIDs in source code (only placeholders with brackets)
- [ ] No private keys or certificates committed
- [ ] Environment variables used for sensitive data
- [ ] .env file added to .gitignore
- [ ] claude_desktop_config.json not committed
- [ ] Test files use environment variables or placeholders
- [ ] Documentation uses example values only
- [ ] .gitignore covers all credential patterns

## 🔄 Regular Security Maintenance

### Monthly
- [ ] Rotate OCI API keys
- [ ] Review committed files for accidental credentials
- [ ] Update .gitignore if needed
- [ ] Verify environment variable usage

### Before Each Commit
- [ ] Check git diff for credentials
- [ ] Verify placeholder OCIDs only
- [ ] Test with environment variables
- [ ] Run security scan

## 📞 Support

If you discover a security issue:
1. **Do NOT create a public issue**
2. Email security concerns privately
3. Include steps to reproduce
4. Allow time for fix before disclosure

---

**Remember: Security is everyone's responsibility. When in doubt, use environment variables and configuration files instead of hardcoded values.**