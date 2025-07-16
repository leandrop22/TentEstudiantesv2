import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Check-in' },
  { path: '/register', label: 'Registro' },
  { path: '/admin', label: 'Admin' },
];

export default function Tabs() {
  return (
    <nav className="flex justify-center space-x-6 py-4 bg-gray-100">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            isActive
              ? 'text-green-700 font-semibold underline'
              : 'text-gray-700 hover:text-green-700'
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
