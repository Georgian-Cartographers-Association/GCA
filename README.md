# 🗺️ GCA Conference 2025

**საქართველოს კარტოგრაფთა ასოციაციის კონფერენციის ვებგვერდი**

Georgian Cartographers Association Conference Website

🌐 **Live Site:** [gca.qgis.ge](https://gca.qgis.ge)

---

## ✨ Features / მახასიათებლები

- 🌍 **Bilingual** - Full Georgian/English language support
- 📱 **Responsive** - Desktop, tablet, and mobile optimized
- 🎠 **Speaker Slider** - 20 speakers with auto-scroll carousel
- 🗺️ **OpenStreetMap** - Interactive venue map
- 📝 **Google Forms** - Integrated registration
- ⚡ **Single File** - Just one HTML file, easy to deploy
- 🚀 **GitHub Pages Ready** - Deploy in minutes

---

## 🚀 Deployment / განთავსება

### GitHub Pages

1. Upload files to your repository
2. Go to **Settings** → **Pages**
3. Select **Source**: Deploy from branch
4. Select **Branch**: `main` and folder `/ (root)`
5. Click **Save**

### Custom Domain (gca.qgis.ge)

1. In repository **Settings** → **Pages** → **Custom domain**
2. Enter: `gca.qgis.ge`
3. Add DNS records at your domain registrar:
   - Type: `CNAME`
   - Name: `gca`
   - Value: `yourusername.github.io`

---

## 📁 Files / ფაილები

```
gca-conference/
├── index.html          # Main website
├── README.md           # Documentation
├── LICENSE             # All Rights Reserved
└── CNAME               # Custom domain config
```

---

## 🎨 Customization / პერსონალიზაცია

### Google Form Integration

Replace `YOUR_FORM_ID` in index.html with your actual Google Form ID:

```html
<a href="https://docs.google.com/forms/d/e/YOUR_ACTUAL_FORM_ID/viewform" ...>
```

### Add Speaker Photos

Replace placeholder divs with actual images:

```html
<div class="speaker-image">
    <img src="photos/speaker1.jpg" alt="Speaker Name" style="width:100%;height:100%;object-fit:cover;">
</div>
```

### Edit Colors

Modify CSS variables in `<style>`:

```css
:root {
    --gold: #d69e2e;      /* Primary accent */
    --deep-blue: #1a365d; /* Secondary color */
    /* ... */
}
```

---

## 📋 Sections / სექციები

1. **Hero** - Conference banner with date/location
2. **About** - 4 feature cards
3. **Speakers** - 20 speaker carousel with auto-scroll
4. **Schedule** - 3-day program with tabs
5. **Venue** - OpenStreetMap integration
6. **Registration** - Google Form link
7. **Contact** - Form + social links
8. **Footer** - Navigation + contact info

---

## 🔧 Tech Stack

- **Pure HTML/CSS/JS** - No build tools required
- **Leaflet.js** - OpenStreetMap integration
- **Google Fonts** - Playfair Display + Source Sans 3

---

## 📞 Contact / კონტაქტი

**Georgian Cartographers Association**
- 📧 geocartographersassoc@gmail.com
- 📍 I. Chavchavadze Ave. 3, Tbilisi, Georgia 0128
- 🌐 [gca.qgis.ge](https://gca.qgis.ge)

**Social Media:**
- [Facebook](https://www.facebook.com/profile.php?id=61556291459201)
- [Instagram](https://www.instagram.com/gca_ska)
- [YouTube](https://www.youtube.com/@GeorgianCartographersAssoc)

---

## 📄 License / ლიცენზია

**All Rights Reserved** - See [LICENSE](LICENSE) file.

This website and its source code are the exclusive property of the Georgian Cartographers Association. Unauthorized copying, modification, or distribution is prohibited.

---

© 2025 Georgian Cartographers Association / საქართველოს კარტოგრაფთა ასოციაცია
