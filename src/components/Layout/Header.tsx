import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Header = ({ title, showBack = false, rightAction }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-4 bg-card border-b border-border">
      <div className="flex items-center">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-lg font-semibold ml-2">{title}</h1>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
};