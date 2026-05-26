# Wrenchwise TMS

Wrenchwise TMS is a web-based tool management system designed to help users manage tools, inventory, and related workflows efficiently.

## Features
- Tool tracking and management
- Inventory overview
- Mock services for development
- Simple state management
- Modern, responsive UI

## Getting Started

### Prerequisites
- Node.js (for development server)


### Running Locally

#### On macOS
1. Open Terminal and navigate to your project directory:
   ```sh
   cd /path/to/Wrenchwise_tms
   ```
2. Install dependencies (if any):
   ```sh
   npm install
   ```
3. Start a local server (recommended):
   ```sh
   npx live-server --port=8080 --open=index.html
   ```
4. Your default browser should open automatically. If not, open [http://127.0.0.1:8080](http://127.0.0.1:8080) manually.

#### On Windows
1. Open Command Prompt (cmd) or PowerShell and navigate to your project directory:
   ```cmd
   cd path\to\Wrenchwise_tms
   ```
2. Install dependencies (if any):
   ```cmd
   npm install
   ```
3. Start a local server (recommended):
   ```cmd
   npx live-server --port=8080 --open=index.html
   ```
4. Your default browser should open automatically. If not, open [http://127.0.0.1:8080](http://127.0.0.1:8080) manually.

### Project Structure
- `index.html` - Main HTML file
- `src/` - Source files
  - `main.js` - Main application logic
  - `mockServices.js` - Mock backend services
  - `state.js` - State management
  - `style.css` - Styles

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)
