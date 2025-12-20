# Wiki Upload Quick Start

**5-minute guide to upload your GitHub Wiki**

---

## Step 1: Customize URLs (1 minute)

```bash
cd wiki

# Replace 'yourusername' with your actual GitHub username
sed -i '' 's/yourusername/YOUR-GITHUB-USERNAME/g' *.md

# Example:
# sed -i '' 's/yourusername/abirzu/g' *.md
```

---

## Step 2: Enable Wiki (30 seconds)

1. Go to your GitHub repository
2. Click **Settings**
3. Scroll to **Features** section
4. Check ✅ **Wikis**

---

## Step 3: Upload Wiki Pages (3 minutes)

### Method A: Web Interface (Easier)

For each file in `wiki/`:

1. Go to **Wiki** tab
2. Click **New Page**
3. Copy content from markdown file
4. Paste into editor
5. Click **Save Page**

Pages to create:
- `Home.md` → Save as "Home"
- `Installation.md` → Save as "Installation"
- `Capabilities.md` → Save as "Capabilities"
- `API-Reference.md` → Save as "API-Reference"
- `Future-Enhancements.md` → Save as "Future-Enhancements"
- `Troubleshooting.md` → Save as "Troubleshooting"

### Method B: Git (Faster if you know Git)

```bash
# Clone wiki repository
git clone https://github.com/YOUR-USERNAME/mcp-oci-logan-server.wiki.git

# Copy wiki files
cd mcp-oci-logan-server.wiki
cp ../mcp-oci-logan-server/wiki/*.md .
rm README.md  # Don't upload the README

# Commit and push
git add .
git commit -m "Add comprehensive wiki pages"
git push origin master
```

---

## Step 4: Add Sidebar (30 seconds)

In your GitHub Wiki:

1. Click **Add a custom sidebar**
2. Paste this content:

```markdown
### MCP OCI Logan Server

**Getting Started**
* [Home](Home)
* [Installation](Installation)

**Using the Server**
* [Capabilities](Capabilities)
* [API Reference](API-Reference)
* [Troubleshooting](Troubleshooting)

**Planning**
* [Future Enhancements](Future-Enhancements)

**Links**
* [Repository](https://github.com/YOUR-USERNAME/mcp-oci-logan-server)
* [Documentation](https://github.com/YOUR-USERNAME/mcp-oci-logan-server/tree/master/docs)
```

3. Replace `YOUR-USERNAME` with your GitHub username
4. Click **Save Page**

---

## Step 5: Update Main README (30 seconds)

Add this to your main `README.md`:

```markdown
## 📚 Documentation

- **[📖 GitHub Wiki](https://github.com/YOUR-USERNAME/mcp-oci-logan-server/wiki)** - Complete documentation
  - [Installation Guide](https://github.com/YOUR-USERNAME/mcp-oci-logan-server/wiki/Installation)
  - [Capabilities Reference](https://github.com/YOUR-USERNAME/mcp-oci-logan-server/wiki/Capabilities)
  - [Troubleshooting](https://github.com/YOUR-USERNAME/mcp-oci-logan-server/wiki/Troubleshooting)
  - [Future Enhancements](https://github.com/YOUR-USERNAME/mcp-oci-logan-server/wiki/Future-Enhancements)
```

---

## Verification Checklist

- [ ] All 5 wiki pages uploaded
- [ ] Sidebar navigation created
- [ ] All links work (click through them)
- [ ] Code blocks are properly formatted
- [ ] Your GitHub username is correct (not "yourusername")
- [ ] Main README links to wiki

---

## That's It! 🎉

Your wiki is now live at:
```
https://github.com/YOUR-USERNAME/mcp-oci-logan-server/wiki
```

---

## Troubleshooting

### Wiki tab not showing
→ Enable Wikis in repository Settings → Features

### Permission denied when pushing
→ Check you have write access to the repository
→ Use HTTPS instead of SSH: `git clone https://...`

### Formatting looks wrong
→ Check markdown syntax
→ GitHub uses GitHub Flavored Markdown

---

## What You Just Created

- ✅ **Home Page** - Project overview and quick start
- ✅ **Installation Guide** - Complete setup instructions
- ✅ **Capabilities** - All 33 tools documented
- ✅ **API Reference** - Official OCI API documentation with examples
- ✅ **Future Enhancements** - Roadmap and vision
- ✅ **Troubleshooting** - 50+ common issues solved

**Total**: ~5,500 lines of professional documentation

---

## Next Steps

1. **Announce** - Share wiki link with users
2. **Monitor** - Check which pages get most views
3. **Update** - Keep wiki in sync with code changes
4. **Engage** - Encourage community contributions

---

**Need Help?**
- See full instructions: `wiki/README.md`
- See summary: `WIKI_CREATION_SUMMARY.md`

**Version**: 1.3.0
**Created**: October 2025
