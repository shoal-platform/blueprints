# Platform201 Welcome App

The welcome page served as the default container when you create a new environment in [Platform201](https://platform201.com).

It is a plain static site with a tiny Node.js server. There are no dependencies to install and no build step, so it deploys in seconds.

## Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set the `PORT` environment variable to use a different port.

## Project structure

```
server.js           Static file server (Node.js built-ins only)
public/
  index.html        The page
  styles.css        Styles and light/dark theme colors
  theme.js          Light/dark theme toggle
  logo.png          Logo
  icon.svg          Favicon
```

To change the page, edit the files in `public/`. Anything you put there is served as-is.

## Documentation

- [Platform201 Docs](https://docs.platform201.com)
- [Initial Setup](https://docs.platform201.com/first-setup/)
- [Deployment Guides](https://docs.platform201.com/deploy-app/)

## Contact

[hello@platform48.com](mailto:hello@platform48.com)
