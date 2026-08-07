import { useEffect, useState } from "react";
import { matchHex } from "../utils/matchHex";

import Card from "../components/common/Card";
import { bBrand } from "../styles/buttonStyles";
import { getSavedJobs } from "../services/savedJobs";

import {
  Bookmark,
  BookmarkCheck,
  MapPin,
  CircleDollarSign,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SavedJobs({ saved, toggle }) {
  const navigate = useNavigate();
  const setView = (view) => navigate(`/${view}`);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSavedJobs()
      .then((rows) => active && setJobs(rows))
      .catch((e) => console.error("Failed to load saved jobs", e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Reflect un-saves immediately using the shared `saved` id list.
  const list = jobs.filter((j) => saved.includes(j.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-extrabold text-slate-900">
          Saved Jobs
        </h2>
        <p className="text-slate-500 mt-1">
          Roles you've bookmarked to revisit.
        </p>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-slate-400" />
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center">
          <Bookmark size={36} className="text-slate-300 mx-auto" />
          <p className="mt-3 font-semibold text-slate-700">No saved jobs yet</p>
          <p className="text-sm text-slate-500">
            Bookmark roles from Job Matches to see them here.
          </p>
          <button onClick={() => setView("matches")} className={bBrand + " mt-4"}>
            Browse Matches
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((j) => (
            <Card
              key={j.id}
              hover
              className="p-5 flex items-center gap-4 cursor-pointer"
              onClick={() => j.apply_url && window.open(j.apply_url, "_blank")}
            >
              <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center font-bold text-brand shrink-0">
                {j.company?.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate">
                  {j.title}
                </div>
                <div className="text-sm text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{j.company}</span>
                  {j.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {j.location}
                    </span>
                  )}
                  {j.salary && (
                    <span className="flex items-center gap-1">
                      <CircleDollarSign size={12} />
                      {j.salary}
                    </span>
                  )}
                </div>
              </div>

              {typeof j.match_score === "number" && (
                <span
                  className="num font-bold shrink-0"
                  style={{ color: matchHex(j.match_score) }}
                >
                  {j.match_score}%
                </span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(j.id);
                }}
                className="brand bg-brand-50 rounded-lg p-2 shrink-0"
                aria-label="Remove bookmark"
              >
                <BookmarkCheck size={18} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
