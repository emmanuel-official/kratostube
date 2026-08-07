import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Play, TrendingUp, Users, Clock, Eye, Activity, LogIn, ThumbsUp, MessageSquare, Video } from 'lucide-react';

const mockMetrics = {
  views: { value: '2.4M', change: '+14.5%' },
  watchTime: { value: '450K hrs', change: '+8.2%' },
  subs: { value: '12.5K', change: '+22.1%' },
  revenue: { value: '$8,450', change: '+5.4%' },
};

export default function App() {
  const [timeRange, setTimeRange] = useState('7D');
  const [userToken, setUserToken] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState(mockMetrics);
  const [topVideos, setTopVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Google OAuth Login trigger
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setUserToken(tokenResponse.access_token);
      fetchRealAnalytics(tokenResponse.access_token, timeRange);
    },
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
    onError: (err) => console.error('OAuth Login Failed:', err)
  });

  const getStartDate = (range) => {
    const d = new Date();
    const days = range === '1D' ? 1 : range === '7D' ? 7 : range === '30D' ? 30 : 90;
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const getEndDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // Analytics API usually has a 1-day lag
    return d.toISOString().split('T')[0];
  };

  const fetchRealAnalytics = async (accessToken, range) => {
    setLoading(true);
    try {
      const startDate = getStartDate(range);
      const endDate = getEndDate();

      // 1. Fetch Analytics Report (Views, Watch Time, Subs Gained)
      const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports?` + 
        `ids=channel==MINE` +
        `&startDate=${startDate}` +
        `&endDate=${endDate}` +
        `&metrics=views,estimatedMinutesWatched,subscribersGained` +
        `&dimensions=day` +
        `&sort=day`;

      const analyticsRes = await fetch(analyticsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const analyticsData = await analyticsRes.json();

      if (analyticsData.rows) {
        // Map rows to chart data: [date, views, estimatedMinutesWatched, subscribersGained]
        const formattedChart = analyticsData.rows.map(row => ({
          name: row[0],
          views: row[1],
          watchTime: Math.round(row[2] / 60), // Convert minutes to hours
          subs: row[3]
        }));
        setChartData(formattedChart);

        // Sum totals for metrics cards
        const totalViews = formattedChart.reduce((acc, curr) => acc + curr.views, 0);
        const totalWatchMinutes = analyticsData.rows.reduce((acc, curr) => acc + curr[2], 0);
        const totalSubs = formattedChart.reduce((acc, curr) => acc + curr.subs, 0);

        setMetrics({
          views: { value: formatNumber(totalViews), change: 'Live' },
          watchTime: { value: `${Math.round(totalWatchMinutes / 60)} hrs`, change: 'Live' },
          subs: { value: `+${totalSubs}`, change: 'Live' },
          revenue: { value: '$8,450', change: '+5.4%' }
        });
      }

      // 2. Fetch Channel Top Videos with Likes & Comments
      const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=5&order=viewCount`;
      const videosRes = await fetch(videosUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const videosData = await videosRes.json();

      if (videosData.items && videosData.items.length > 0) {
        const videoIds = videosData.items.map(item => item.id.videoId).join(',');
        
        // Fetch detailed statistics (likes, comments, view count) for these videos
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}`;
        const statsRes = await fetch(statsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const statsData = await statsRes.json();

        const formattedVideos = statsData.items.map(item => ({
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          views: formatNumber(item.statistics.viewCount),
          likes: formatNumber(item.statistics.likeCount || 0),
          comments: formatNumber(item.statistics.commentCount || 0)
        }));
        setTopVideos(formattedVideos);
      }

    } catch (err) {
      console.error('Error fetching OAuth Youtube data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (range) => {
    setTimeRange(range);
    if (userToken) {
      fetchRealAnalytics(userToken, range);
    }
  };

  const formatNumber = (num) => {
    num = Number(num);
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num;
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-200">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              KratosTech
            </span>
          </div>

          <div>
            {!userToken ? (
              <button
                onClick={() => login()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-medium shadow-lg shadow-violet-500/20 hover:opacity-90 transition-all"
              >
                <LogIn className="w-4 h-4" /> Sign in with Google
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                OAuth Analytics Connected
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Title & Time Range */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Kratos</span>Tube
            </h1>
            <p className="text-slate-400 text-sm">Real-time channel performance analytics</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            {['1D', '7D', '30D', '90D'].map((range) => (
              <button
                key={range}
                onClick={() => handleRangeChange(range)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  timeRange === range 
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <MetricCard title="Period Views" value={metrics.views.value} change={metrics.views.change} icon={<Eye />} />
          <MetricCard title="Watch Time" value={metrics.watchTime.value} change={metrics.watchTime.change} icon={<Clock />} />
          <MetricCard title="Subs Gained" value={metrics.subs.value} change={metrics.subs.change} icon={<Users />} />
          <MetricCard title="Est. Revenue" value={metrics.revenue.value} change={metrics.revenue.change} icon={<TrendingUp />} />
        </div>

        {/* Chart Section */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="text-cyan-400 w-5 h-5" />
            <h2 className="text-lg font-semibold text-white">Engagement Overview</h2>
          </div>
          
          <div className="h-80 w-full relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWatchTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0B0F19', 
                      borderColor: '#ffffff20',
                      borderRadius: '12px'
                    }} 
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" name="Views" />
                  <Area type="monotone" dataKey="watchTime" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorWatchTime)" name="Watch Time (hrs)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Performing Videos Section */}
        {topVideos.length > 0 && (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <Video className="text-violet-400 w-5 h-5" />
              <h2 className="text-lg font-semibold text-white">Top Performing Videos</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {topVideos.map(vid => (
                <div key={vid.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <img src={vid.thumbnail} alt={vid.title} className="w-24 h-14 object-cover rounded-lg" />
                    <div>
                      <h4 className="font-semibold text-sm line-clamp-1 text-white">{vid.title}</h4>
                      <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-cyan-400" /> {vid.views} views</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-slate-300 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                      <ThumbsUp className="w-4 h-4 text-emerald-400" />
                      <span>{vid.likes}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                      <MessageSquare className="w-4 h-4 text-violet-400" />
                      <span>{vid.comments}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function MetricCard({ title, value, change, icon }) {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-white/5 text-slate-400">{icon}</div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
          {change}
        </div>
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}