import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="navigation">
      <ul>
        <li>
          <Link 
            to="/admin" 
            className={location.pathname === '/admin' ? 'active' : ''}
          >
            Admin Page
          </Link>
        </li>
        <li>
          <Link 
            to="/customer" 
            className={location.pathname === '/customer' ? 'active' : ''}
          >
            Customer Page
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;
