export default function CategoryFilter() {
    return (
        <div className="w-full bg-white p-4 rounded mb-8">
            <ul className="flex flex-row flex-wrap gap-3 items-center text-sm">
                <li className="bg-light-blue px-6 py-1 rounded">All</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Appetizers</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Mains</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Sides</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Dessert</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Breakfast</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Lunch</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Dinner</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Soup</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Salad</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Dip</li>
                <li className="bg-light-grey px-6 py-1 rounded hover:cursor-pointer hover:bg-light-blue">Vegetarian</li>
            </ul>
        </div>
    )
}