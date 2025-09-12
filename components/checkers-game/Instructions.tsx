const Instructions: React.FC = () => {
  return (
    <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
      <h2 className="text-xl font-bold text-gray-800 mb-3">Game Rules</h2>
      <ul className="list-none pl-5">
        {[
          "Red moves first, followed by Black",
          "Pieces move diagonally forward one square",
          "Jump opponent's pieces by moving two squares diagonally",
          "Kings can move diagonally in any direction",
          "Capture all opponent pieces to win"
        ].map((rule, index) => (
          <li key={index} className="mb-2 relative pl-5">
            <span className="absolute left-0 text-blue-500 font-bold text-lg">•</span>
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Instructions;