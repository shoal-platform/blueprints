import reactLogo from "./assets/shoal-logo.svg";
import "./App.css";

function App() {
  return (
    <div id="center">
      <div className="heading">
        <img src={reactLogo} alt="Logo" className="logo" />
        <h1>Hello World</h1>
      </div>
      <p>
        This is a static website deployed on{" "}
        <a href="https://shoalstack.com">Shoal</a>
      </p>
    </div>
  );
}

export default App;
