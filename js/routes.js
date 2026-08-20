import List from './pages/List.js?a=1';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Statistics from './pages/Statistics.js';
import Login from './pages/Login.js';
import { RegisterPage as Register } from './pages/Register.js'; // ✅ Đã sửa thành Named Import
import Submit from './pages/Submit.js';
import Admin from './pages/Admin.js';
import Profile from './pages/Profile.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/statistics', component: Statistics },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/submit', component: Submit },
    { path: '/admin', component: Admin },
    { path: '/profile', component: Profile },
];
