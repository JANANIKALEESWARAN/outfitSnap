import React, { useMemo, useState } from "react";
import "./AnalyticsDashboard.css";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sidebar } from "../../Components/Sidebar/Sidebar";
import { analyticsData, deriveSummary } from "../../data/analyticsData";

const COLORS = ["#7c3aed", "#f97316", "#22d3ee", "#16a34a"];

export const AnalyticsDashboard = () => {
  const [timeframe, setTimeframe] = useState("weekly");
  const dataset = analyticsData[timeframe];

  const { totals, avgOrders, conversion } = useMemo(
    () => deriveSummary(dataset),
    [dataset]
  );

  return (
    <div className="analytics-layout">
      <Sidebar />
      <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <p className="eyebrow">Customer insights</p>
          <h1>Analytics dashboard</h1>
          <p className="subtext">
            Monitor how customers interact with products and spot trends to act
            faster.
          </p>
        </div>
        <div className="timeframe-toggle">
          <label htmlFor="timeframe">Time range</label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value)}
          >
            <option value="weekly">Last 7 days</option>
            <option value="monthly">Last 12 months</option>
          </select>
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">Products added</p>
          <h2>{totals.added.toLocaleString()}</h2>
          <p className="metric-footnote">Total add-to-cart events</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Wishlist saves</p>
          <h2>{totals.wishlist.toLocaleString()}</h2>
          <p className="metric-footnote">Customers bookmarking items</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Orders placed</p>
          <h2>{totals.orders.toLocaleString()}</h2>
          <p className="metric-footnote">Avg {avgOrders} / interval</p>
        </article>
        <article className="metric-card highlight">
          <p className="metric-label">Cart → order conversion</p>
          <h2>{conversion}%</h2>
          <p className="metric-footnote">Benchmark 28%</p>
        </article>
      </section>

      <section className="chart-grid">
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <h3>Engagement trend</h3>
              <p>Compare adds, wishlist saves, and purchases over time.</p>
            </div>
            <Legend />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={dataset} margin={{ left: 0, right: 0 }}>
              <defs>
                <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorWishlist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="added"
                stackId="1"
                stroke="#7c3aed"
                fill="url(#colorAdded)"
                name="Added"
              />
              <Area
                type="monotone"
                dataKey="wishlist"
                stackId="1"
                stroke="#f97316"
                fill="url(#colorWishlist)"
                name="Wishlist"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stackId="1"
                stroke="#22d3ee"
                fill="url(#colorOrders)"
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <h3>Orders vs adds</h3>
              <p>Track how often carts convert into purchases.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dataset} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="added" fill="#7c3aed" name="Add to cart" />
              <Bar dataKey="orders" fill="#22d3ee" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <h3>Category interest</h3>
              <p>Where customers discover the most products.</p>
            </div>
          </div>
          <div className="pie-wrapper">
            <ResponsiveContainer width="60%" height={260}>
              <PieChart>
                <Tooltip />
                <Pie
                  data={analyticsData.categoryShares}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {analyticsData.categoryShares.map((entry, index) => (
                    <Cell
                      key={`slice-${entry.name}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="engagement-list">
              {analyticsData.engagementStats.map((stat) => (
                <div key={stat.metric} className="engagement-item">
                  <div>
                    <p className="metric-label">{stat.metric}</p>
                    <h4>{stat.current}%</h4>
                  </div>
                  <span
                    className={
                      stat.change >= 0 ? "trend-pill up" : "trend-pill down"
                    }
                  >
                    {stat.change >= 0 ? "+" : ""}
                    {stat.change}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

