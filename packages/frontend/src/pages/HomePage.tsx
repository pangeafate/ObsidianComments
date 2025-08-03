export function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Obsidian Comments
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A collaborative Markdown editor with real-time editing and commenting features.
          Publish your notes from Obsidian and collaborate with others in real-time.
        </p>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">How it works:</h2>
          <ol className="text-left space-y-2">
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
              Publish a note from Obsidian using our plugin
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
              Share the generated URL with collaborators
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
              Edit and comment together in real-time
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}