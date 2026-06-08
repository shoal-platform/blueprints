import { Link, NavLink, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          Pastes
        </Link>
        <nav>
          <NavLink to="/" end>
            Board
          </NavLink>
          <NavLink to="/new">New paste</NavLink>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
