import React from 'react'
import './Navbar.css'
import navlogo from '../../assets/nav-logo.svg'
import navprofile from '../../assets/nav-profile.svg'
import { Link, useNavigate } from 'react-router-dom'

export const Navbar = () => {
  const navigate = useNavigate();

  const isAdminLoggedIn = !!localStorage.getItem("admin-auth-token");

  const handleLogout = () => {
    localStorage.removeItem("admin-auth-token");
    window.location.href = "http://localhost:3000/"; // redirect back to login page
  };

  return (
    <div className='navbar'>
      <div className='nav-left'>
      <img src={navlogo} alt="" className='nav-logo'/>
       <ul className="nav-links">
        <li>
            {isAdminLoggedIn ? (
              <Link to="/addproduct">Add Product</Link>
            ) : (
              <span className="disabled-link">Add Product</span>
            )}
          </li>
          <li>
            {isAdminLoggedIn ? (
              <Link to="/listproduct">List Product</Link>
            ) : (
              <span className="disabled-link">List Product</span>
            )}
          </li>
        </ul>
      </div>
      
      
      <div className="nav-right">
        {isAdminLoggedIn ? (
          <button onClick={handleLogout}>Logout</button>
        ) : (
          <Link to="/adminlogin">
            <button>Login</button>
          </Link>
        )}
      </div>
      
    </div>
  )
}
