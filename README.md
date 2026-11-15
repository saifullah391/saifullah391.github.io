# Saif Ullah: Remote Sensing & GIS Portfolio

Personal website hosted at [saifullah391.github.io](https://saifullah391.github.io/).

## Edit on this computer

This folder is connected to the GitHub Pages repository. Edit the HTML pages and `assets/style.css` / `assets/main.js` here.

To publish your changes, open PowerShell in this folder and run:

```powershell
.\publish.ps1
```

The helper shows the changed files, asks for a commit message, and asks you to type `PUSH` before it sends them to GitHub. A push to `main` triggers the GitHub Pages deployment automatically. Check the live site after the Pages build finishes.

Do not add files that contain private information, such as a CV with a street address or phone numbers. Only publish project material you are allowed to share.

## Add a project from the browser (admin page)

1. Create a GitHub fine-grained personal access token: GitHub → Settings → Developer settings → Fine-grained tokens → *Only select repositories*: `saifullah391.github.io` → Repository permissions → **Contents: Read and write**.
2. Open <https://saifullah391.github.io/admin/>, choose **Sign In Using Access Token** and paste the token.
3. Portfolio → Projects → add a project: title, short web name, summary, card image, large map, more figures, source-code files and links.
4. **Save = publish.** Each save is a commit to `main`; the site updates after the Pages build (1–2 minutes). New projects get a card on the portfolio and a page at `project.html?p=<short-web-name>`.

To try changes without publishing, run a local server in this folder (`py -m http.server 8642`), open <http://localhost:8642/admin/> and choose **Work with Local Repository**.

## Pages

- `index.html`: the whole one-page site: hero with animated globe, stats, filterable and searchable projects, before/after image sliders, interactive map (Leaflet), experience timeline, education, skills and a contact form
- `portfolio.html`: redirect to `index.html#work`, so old links keep working
- `assets/main.js`: all interactions (dark/light theme, globe, sliders, map, filters, counters, lightbox, contact form)
- `assets/img/slider-*.jpg`: matched image pairs for the before/after sliders
- `projects/*.html`: hand-built case studies (Islamabad GeoAI, Karachi coast, Bali zonal analysis)
- `project.html`: detail page for projects added through the admin page (reads `data/projects.json`)
- `cv.html` + `assets/Saif-Ullah-CV.pdf`: online CV and downloadable PDF
- `code/`: source code for every case study
- `admin/`: Sveltia CMS admin page (`config.yml` defines the project form)
- `404.html`, `sitemap.xml`, `robots.txt`: error page and search-engine files

`_config.yml` keeps `README.md` and `publish.ps1` off the public website.
