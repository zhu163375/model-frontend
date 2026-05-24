import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue"; // 假设你有一个 HomeView 组件
import Login from "../views/Login.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/dashboard",
      name: "dashboard",
      component: Dashboard,
    },
    {
      path: "/login",
      name: "login",
      component: Login,
    },
  ],
});

export default router;
