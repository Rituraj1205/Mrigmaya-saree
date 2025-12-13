import axios from "axios";
import { API_BASE } from "../utils/apiBase";

const instance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" }
});

export default instance;
