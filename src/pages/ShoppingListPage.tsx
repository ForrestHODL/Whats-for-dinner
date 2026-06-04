import { useMemo, useState } from "react";
import { guestEmailsForCalendar } from "../lib/calendarGuests";
import {
  buildShoppingCalendarUrl,
  combineDateAndTime,
  defaultShoppingDateValue,
  timeInputValue,
} from "../lib/googleCalendar";
import {
  formatShoppingListForCalendar,
  groupShoppingListByCategory,
} from "../lib/shoppingStoreCategories";
import {
  getShoppingItemDetails,
  getShoppingItemSourceTitles,
  formatShoppingItemDisplay,
} from "../lib/mergeShoppingIngredients";
import { useStore } from "../StoreContext";

type ShoppingTab = "list" | "common" | "layout";

export default function ShoppingListPage() {
  const {
    shoppingList,
    shoppingStoreCategories,
    commonShoppingItems,
    addShoppingItems,
    toggleShoppingItem,
    removeShoppingItem,
    clearCheckedShoppingItems,
    updateShoppingItemCategory,
    updateShoppingStoreCategoryLabel,
    moveShoppingStoreCategory,
    addShoppingStoreCategory,
    removeShoppingStoreCategory,
    recategorizeShoppingList,
    addCommonShoppingItem,
    removeCommonShoppingItem,
    calendarGuests,
  } = useStore();

  const [activeTab, setActiveTab] = useState<ShoppingTab>("list");
  const [newItem, setNewItem] = useState("");
  const [newCommonItem, setNewCommonItem] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [addedFlash, setAddedFlash] = useState<string | null>(null);
  const [shopDate, setShopDate] = useState(defaultShoppingDateValue);
  const [shopTime, setShopTime] = useState(() => timeInputValue(10, 0));

  const listSections = useMemo(
    () => groupShoppingListByCategory(shoppingList, shoppingStoreCategories),
    [shoppingList, shoppingStoreCategories]
  );

  const uncheckedItems = useMemo(
    () => shoppingList.filter((item) => !item.checked),
    [shoppingList]
  );
  const checkedCount = shoppingList.length - uncheckedItems.length;

  const calendarUrl = useMemo(() => {
    if (uncheckedItems.length === 0) return null;
    const start = combineDateAndTime(shopDate, shopTime);
    const details = formatShoppingListForCalendar(
      shoppingList,
      shoppingStoreCategories
    );
    return buildShoppingCalendarUrl({
      items: uncheckedItems.map((item) =>
        formatShoppingItemDisplay(item)
      ),
      start,
      details: details || undefined,
      guests: guestEmailsForCalendar(calendarGuests),
    });
  }, [
    uncheckedItems,
    shoppingList,
    shoppingStoreCategories,
    shopDate,
    shopTime,
    calendarGuests,
  ]);

  const flashAdded = (text: string) => {
    setAddedFlash(text);
    setTimeout(() => setAddedFlash(null), 1500);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItem.trim();
    if (!text) return;
    addShoppingItems([text]);
    setNewItem("");
  };

  const handleQuickAdd = (text: string) => {
    addShoppingItems([text]);
    flashAdded(text);
  };

  const handleAddCommonItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newCommonItem.trim();
    if (!text) return;
    if (addCommonShoppingItem(text)) {
      setNewCommonItem("");
    }
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSectionName.trim();
    if (!name) return;
    if (addShoppingStoreCategory(name)) {
      setNewSectionName("");
    }
  };

  return (
    <div className="page shopping-page">
      <header className="page-header">
        <h1>Shopping list</h1>
        <p className="page-lead">
          Sorted by your store layout — adjust sections to match where you shop
        </p>
      </header>

      <div className="shopping-tabs" role="tablist" aria-label="Shopping views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "list"}
          className={`shopping-tab ${activeTab === "list" ? "active" : ""}`}
          onClick={() => setActiveTab("list")}
        >
          My list
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "common"}
          className={`shopping-tab ${activeTab === "common" ? "active" : ""}`}
          onClick={() => setActiveTab("common")}
        >
          Common
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "layout"}
          className={`shopping-tab ${activeTab === "layout" ? "active" : ""}`}
          onClick={() => setActiveTab("layout")}
        >
          Store
        </button>
      </div>

      {addedFlash && (
        <div className="toast shopping-added-toast" role="status">
          Added {addedFlash}
        </div>
      )}

      {activeTab === "list" ? (
        <>
          <form className="shopping-add-form" onSubmit={handleAddItem}>
            <label className="shopping-add-label" htmlFor="shopping-new-item">
              Add item
            </label>
            <div className="shopping-add-row">
              <input
                id="shopping-new-item"
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="e.g. Milk, eggs, bread"
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn-primary shopping-add-btn"
                disabled={!newItem.trim()}
              >
                Add
              </button>
            </div>
          </form>

          {shoppingList.length === 0 ? (
            <p className="shopping-empty">
              Your list is empty. Type an item above, tap something on the
              Common tab, or add ingredients from a recipe.
            </p>
          ) : (
            <>
              <div className="shopping-list-grouped">
                {listSections.map((section) => (
                  <section
                    key={section.category.id}
                    className="shopping-list-section"
                  >
                    <h2 className="shopping-section-heading">
                      {section.category.label}
                    </h2>
                    <ul className="shopping-list">
                      {section.items.map((item) => (
                        <li
                          key={item.id}
                          className={`shopping-item ${item.checked ? "checked" : ""}`}
                        >
                          <label className="shopping-item-label">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggleShoppingItem(item.id)}
                            />
                            <span className="shopping-item-text">
                              {item.text}
                            </span>
                          </label>
                          <select
                            className="shopping-item-category"
                            value={item.categoryId ?? section.category.id}
                            aria-label={`Section for ${item.text}`}
                            onChange={(e) =>
                              updateShoppingItemCategory(
                                item.id,
                                e.target.value
                              )
                            }
                          >
                            {shoppingStoreCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                          {(() => {
                            const details = getShoppingItemDetails(item);
                            const sources = getShoppingItemSourceTitles(item);
                            if (details.length > 1) {
                              return (
                                <ul className="shopping-item-details">
                                  {details.map((d, idx) => (
                                    <li key={`${idx}-${d.line}`}>
                                      <span className="shopping-item-detail-line">
                                        {d.line}
                                      </span>
                                      {d.sourceTitle && (
                                        <span className="shopping-item-source">
                                          {d.sourceTitle}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            if (sources.length > 0) {
                              return (
                                <span className="shopping-item-source">
                                  {sources.join(", ")}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <button
                            type="button"
                            className="shopping-item-remove"
                            aria-label={`Remove ${item.text}`}
                            onClick={() => removeShoppingItem(item.id)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              {checkedCount > 0 && (
                <button
                  type="button"
                  className="btn-ghost btn-full shopping-clear-checked"
                  onClick={clearCheckedShoppingItems}
                >
                  Clear {checkedCount} checked item
                  {checkedCount === 1 ? "" : "s"}
                </button>
              )}
            </>
          )}

          {uncheckedItems.length > 0 && (
            <section className="shopping-calendar-section">
              <h2>Plan shopping trip</h2>
              <p className="shopping-calendar-lead">
                Create a Google Calendar event with your remaining items grouped
                by store section.
              </p>
              <div className="shopping-calendar-fields">
                <label>
                  Date
                  <input
                    type="date"
                    value={shopDate}
                    onChange={(e) => setShopDate(e.target.value)}
                  />
                </label>
                <label>
                  Time
                  <input
                    type="time"
                    value={shopTime}
                    onChange={(e) => setShopTime(e.target.value)}
                  />
                </label>
              </div>
              <a
                href={calendarUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-full shopping-calendar-btn"
              >
                Add to Google Calendar
              </a>
            </section>
          )}
        </>
      ) : activeTab === "common" ? (
        <>
          <p className="shopping-common-lead">
            Tap an item to add it to your shopping list (auto-sorted by section).
          </p>
          <ul className="shopping-common-grid">
            {commonShoppingItems.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="shopping-common-chip"
                  onClick={() => handleQuickAdd(item)}
                >
                  {item}
                </button>
                <button
                  type="button"
                  className="shopping-common-remove"
                  aria-label={`Remove ${item} from common items`}
                  onClick={() => removeCommonShoppingItem(item)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <form className="shopping-common-add-form" onSubmit={handleAddCommonItem}>
            <label className="shopping-add-label" htmlFor="shopping-common-new">
              Add to common items
            </label>
            <div className="shopping-add-row">
              <input
                id="shopping-common-new"
                type="text"
                value={newCommonItem}
                onChange={(e) => setNewCommonItem(e.target.value)}
                placeholder="e.g. Paper towels"
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn-secondary shopping-add-btn"
                disabled={!newCommonItem.trim()}
              >
                Save
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <p className="shopping-layout-lead">
            Set the order and names of sections to match your grocery store.
            Items are sorted top to bottom as you walk the store.
          </p>

          <ul className="shopping-layout-list">
            {shoppingStoreCategories.map((category, index) => (
              <li key={category.id} className="shopping-layout-row">
                <div className="shopping-layout-order">
                  <button
                    type="button"
                    className="shopping-layout-move"
                    aria-label={`Move ${category.label} earlier`}
                    disabled={index === 0}
                    onClick={() =>
                      moveShoppingStoreCategory(category.id, "up")
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="shopping-layout-move"
                    aria-label={`Move ${category.label} later`}
                    disabled={index === shoppingStoreCategories.length - 1}
                    onClick={() =>
                      moveShoppingStoreCategory(category.id, "down")
                    }
                  >
                    ↓
                  </button>
                </div>
                <input
                  type="text"
                  className="shopping-layout-label-input"
                  defaultValue={category.label}
                  key={`${category.id}-${category.label}`}
                  aria-label={`Section name ${index + 1}`}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== category.label) {
                      updateShoppingStoreCategoryLabel(category.id, value);
                    }
                  }}
                />
                <button
                  type="button"
                  className="shopping-layout-delete"
                  aria-label={`Remove section ${category.label}`}
                  disabled={shoppingStoreCategories.length <= 1}
                  onClick={() => removeShoppingStoreCategory(category.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <form className="shopping-layout-add-form" onSubmit={handleAddSection}>
            <label className="shopping-add-label" htmlFor="shopping-new-section">
              Add store section
            </label>
            <div className="shopping-add-row">
              <input
                id="shopping-new-section"
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g. Deli, Pharmacy"
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn-secondary shopping-add-btn"
                disabled={!newSectionName.trim()}
              >
                Add
              </button>
            </div>
          </form>

          <button
            type="button"
            className="btn-ghost btn-full shopping-recategorize"
            onClick={recategorizeShoppingList}
          >
            Re-sort items into sections
          </button>
        </>
      )}
    </div>
  );
}
