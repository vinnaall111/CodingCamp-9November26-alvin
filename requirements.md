# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly web application that helps users track daily spending. Users add expense transactions through a form, view a scrollable history of transactions, see a running total balance at the top of the page, and visualize spending distribution by category in a pie chart. The application runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, persists data in Local Storage, and works in modern browsers. Optional capabilities include custom categories, a monthly summary view, and sorting transactions by amount or category. The implementation respects the existing project file constraints of a single CSS file in the css/ directory and a single JavaScript file in the js/ directory.

## Glossary

- **Expense_Visualizer**: The Expense & Budget Visualizer web application.
- **Transaction**: A recorded expense entry containing an item name, a numeric amount, a Category, and a date.
- **Category**: A label classifying a Transaction; default categories are Food, Transport, and Fun, and users may add custom categories.
- **Balance**: The sum of all stored Transaction amounts, displayed at the top of the page.
- **Chart**: The pie chart visualization showing the distribution of spending by Category.
- **Local_Storage**: The browser Web Storage API used to persist data on the client.
- **Monthly_Summary**: A view that groups Transactions by calendar month and shows the total spending for each month.
- **Sort_Order**: The selected ordering of the transaction list, either by amount or by Category.

## Requirements

### Requirement 1: Add Transactions

**User Story:** As a user, I want to add a new expense transaction through a form, so that I can record my daily spending.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL display an input form with fields for item name (up to 100 characters), amount (between 0.01 and 999,999,999.99), and Category.
2. THE Expense_Visualizer SHALL offer Food, Transport, and Fun as default Category options in the form.
3. WHEN a user submits the form with all fields filled and an amount between 0.01 and 999,999,999.99, THE Expense_Visualizer SHALL create a new Transaction and add it to the transaction list.
4. IF a user submits the form with one or more empty fields, THEN THE Expense_Visualizer SHALL display a validation message indicating which field(s) are empty and leave the transaction list unchanged.
5. IF a user submits an amount that is not a positive number, exceeds 999,999,999.99, or has more than two decimal places, THEN THE Expense_Visualizer SHALL display a validation message and leave the transaction list unchanged.
6. WHEN a Transaction is added, THE Expense_Visualizer SHALL clear the input form fields.

### Requirement 2: Transaction List

**User Story:** As a user, I want to view all my transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL display a list of all stored Transactions.
2. THE Expense_Visualizer SHALL show the item name, amount, Category, and a delete control for each Transaction in the list.
3. WHILE the number of Transactions exceeds the visible area of the list, THE Expense_Visualizer SHALL allow the list to scroll.
4. WHEN a user activates the delete control for a Transaction, THE Expense_Visualizer SHALL remove that Transaction from the list.
5. WHILE no Transactions are stored, THE Expense_Visualizer SHALL display an empty-state message in the transaction list.

### Requirement 3: Total Balance

**User Story:** As a user, I want to see my total balance at the top of the page, so that I can grasp my overall spending at a glance.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL display the Balance, rounded to two decimal places, at the top of the page.
2. THE Expense_Visualizer SHALL compute the Balance as the sum of all stored Transaction amounts.
3. WHEN a Transaction is added or deleted, THE Expense_Visualizer SHALL recompute and update the Balance.
4. WHEN no Transactions are stored, THE Expense_Visualizer SHALL display a Balance of zero.

### Requirement 4: Spending Chart

**User Story:** As a user, I want a pie chart of spending by category, so that I can understand how my spending is distributed.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL display a Chart as a pie chart showing spending distribution by Category, with each slice labeled with its Category name and sized proportionally to the Category total relative to overall spending.
2. THE Expense_Visualizer SHALL compute each Chart slice as the sum of Transaction amounts for that Category.
3. WHEN a Transaction is added, deleted, or modified, THE Expense_Visualizer SHALL recompute each Chart slice and redisplay the Chart.
4. IF no Transactions are stored, THEN THE Expense_Visualizer SHALL display an empty-state Chart with no slices and an indication that no spending data is available.

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions saved between sessions, so that I do not lose data when I close the browser.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL store all Transactions in Local_Storage.
2. WHEN a Transaction is added or deleted, THE Expense_Visualizer SHALL persist the updated transaction list to Local_Storage.
3. WHEN the Expense_Visualizer loads, THE Expense_Visualizer SHALL load stored Transactions from Local_Storage and display them.
4. IF a write to Local_Storage fails, THEN THE Expense_Visualizer SHALL retain the Transactions in memory and display a failure message.
5. IF the stored data is corrupted or unparseable on load, THEN THE Expense_Visualizer SHALL start with an empty transaction list and display a recovery message.

### Requirement 6: Mobile-Friendly Responsive Design

**User Story:** As a user, I want to use the app on my phone, so that I can track spending on the go.

#### Acceptance Criteria

1. WHILE the viewport width is 640 pixels or less, THE Expense_Visualizer SHALL render a single-column layout in which all content fits within the viewport width without requiring horizontal scrolling.
2. THE Expense_Visualizer SHALL render form fields, buttons, and interactive controls with tap targets of at least 44 by 44 CSS pixels.

### Requirement 7: Custom Categories

**User Story:** As a user, I want to add my own categories, so that I can classify spending beyond the defaults.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL allow a user to add a custom Category with a name between 1 and 50 characters to the form Category options.
2. WHEN a user adds a custom Category, THE Expense_Visualizer SHALL include that Category in the Category selector for future Transactions.
3. WHEN a user adds a custom Category, THE Expense_Visualizer SHALL persist that Category in Local_Storage.
4. IF a user submits a custom Category name that is empty, exceeds 50 characters, or duplicates an existing Category name, THEN THE Expense_Visualizer SHALL display an error message and leave the Category options unchanged.

### Requirement 8: Monthly Summary

**User Story:** As a user, I want a monthly summary, so that I can review my spending per month.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL provide a Monthly_Summary view that groups Transactions by the calendar month of each Transaction date, listing only months containing at least one Transaction, with each month identified by its calendar year and month.
2. THE Expense_Visualizer SHALL display the total spending, computed as the sum of all Transaction amounts within that month, for each month in the Monthly_Summary view.
3. WHEN a user selects a month in the Monthly_Summary view, THE Expense_Visualizer SHALL display the item name, amount, and Category for each Transaction in that month.
4. WHEN no Transactions are stored, THE Expense_Visualizer SHALL display an empty-state message in the Monthly_Summary view.

### Requirement 9: Sort Transactions

**User Story:** As a user, I want to sort my transactions, so that I can find and review them easily.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL allow a user to set the Sort_Order to sort the transaction list by amount in ascending order from lowest to highest numeric value.
2. THE Expense_Visualizer SHALL allow a user to set the Sort_Order to sort the transaction list by Category in ascending alphabetical order from A to Z.
3. WHEN a user changes the Sort_Order, THE Expense_Visualizer SHALL re-render the transaction list in the selected order within 1 second of the change.
4. WHEN the Expense_Visualizer loads with no prior Sort_Order set, THE Expense_Visualizer SHALL sort the transaction list by amount in ascending order.

### Requirement 10: Technology Stack

**User Story:** As a developer, I want a framework-free implementation, so that the app stays simple and portable.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL be implemented using HTML, CSS, and Vanilla JavaScript without external JavaScript libraries, UI frameworks, or runtime dependencies.
2. THE Expense_Visualizer SHALL run entirely in the browser with all data processing, storage, and rendering client-side, requiring no backend server or network requests to function.
3. WHEN the app is loaded, THE Expense_Visualizer SHALL load as a static HTML file without a web server, build step, or compilation.

### Requirement 11: Browser Compatibility

**User Story:** As a user, I want the app to work in my browser, so that I can use it regardless of browser choice.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL render all pages and visual components with consistent layout and element positioning in the latest stable release of Chrome, Firefox, Edge, and Safari.
2. THE Expense_Visualizer SHALL produce identical functional results for all user interactions in the latest stable release of Chrome, Firefox, Edge, and Safari.
3. IF the app is opened in an unsupported browser, THEN THE Expense_Visualizer SHALL display a message indicating the browser is not supported.

### Requirement 12: Performance

**User Story:** As a user, I want a responsive app, so that I do not experience lag when updating data.

#### Acceptance Criteria

1. WHEN a Transaction is added, deleted, or edited, THE Expense_Visualizer SHALL update the Balance to reflect the current Transaction data within 100 milliseconds of the user action completing.
2. WHEN a Transaction is added, deleted, or edited, THE Expense_Visualizer SHALL update the transaction list to reflect the current Transaction data within 100 milliseconds of the user action completing.
3. WHEN a Transaction is added, deleted, or edited, THE Expense_Visualizer SHALL update the Chart to reflect the current Transaction data within 100 milliseconds of the user action completing.

### Requirement 13: File Structure

**User Story:** As a developer, I want a constrained file structure, so that the codebase stays clean and maintainable.

#### Acceptance Criteria

1. THE Expense_Visualizer SHALL contain at most one CSS file located in the css/ directory.
2. THE Expense_Visualizer SHALL contain at most one JavaScript file located in the js/ directory.
