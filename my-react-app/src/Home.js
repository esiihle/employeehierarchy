import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import md5 from 'md5';


import {
    Button,
    Flex,
    Heading, ScrollView, SelectField, Table, TableBody, TableCell, TableRow,
    Text,
    TextField,
    View,
    withAuthenticator,
} from "@aws-amplify/ui-react";
import {getEmployee, listEmployees, listRoles} from "./graphql/queries";
import {
    createEmployee as createEmployeeMutation,
    deleteEmployee as deleteEmployeeMutation, updateEmployee,
} from "./graphql/mutations";
import {API} from "aws-amplify";
import {useNavigate} from "react-router-dom";
import CircularImage from "./Img";

function TableHeader() {
    return (
        <thead className="sticky-header">
        <TableRow>
            <TableCell className="font-bold">Employee Number</TableCell>
            <TableCell className="font-bold">Name</TableCell>
            <TableCell className="font-bold">Role</TableCell>
            <TableCell className="font-bold text-right">Reporting Line Manager</TableCell>
            <TableCell className="font-bold"> </TableCell>
        </TableRow>
        </thead>
    );
}

const App = ({ signOut }) => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [showEmployeeCreateModal, setShowEmployeeCreateModal] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);
    const [roles, setRoles] = useState([]);
    const [existingEmployees, setExistingEmployees] = useState([]);
    const [hierarchicalData, setHierarchicalData] = useState([]);
    const [startDate, setStartDate] = useState(new Date());
    const [sortOrder, setSortOrder] = useState("desc");
    const handleOptionsClick = (employeeId) => {
        setSelectedEmployeeId(employeeId);
        setShowOptionsModal(true);
    };

    const closeOptionsModal = () => {
        setShowOptionsModal(false);
        // If needed, you can reset the selected employee ID or perform other actions
    };

    const handleEmployeeCreateClick = (employeeId) => {
        fetchExistingEmployees()
        setShowEmployeeCreateModal(true);
    };

    const closeEmployeeCreateModal = () => {
        setShowEmployeeCreateModal(false);
        // If needed, you can reset the selected employee ID or perform other actions
    };

    const handleEmployeeClick = async (employeeId) => {
        setSelectedEmployeeId(employeeId);
        setShowEmployeeModal(true);
        setShowOptionsModal(false);

        try {
            const apiData = await API.graphql({
                query: getEmployee, // Assume you have a query named getEmployee to fetch individual employee details
                variables: { id: employeeId },
            });

            const employeeData = apiData.data.getEmployee; // Adjust this based on your actual GraphQL schema
            setSelectedEmployeeData(employeeData);
        } catch (error) {
            console.error("Error fetching employee details:", error);
        }
    };

    const closeEmployeeModal = () => {
        setShowEmployeeModal(false);
    };

    useEffect(() => {
        fetchEmployees();
        fetchRoles();
        fetchExistingEmployees(); // Add this line to fetch existing employees
    }, []);

    async function fetchExistingEmployees() {
        try {
            const apiData = await API.graphql({ query: listEmployees });
            const existingEmployeesFromAPI = apiData.data.listEmployees.items;
            setExistingEmployees(existingEmployeesFromAPI);
        } catch (error) {
            console.error("Error fetching existing employees:", error);
        }
    }

    async function fetchRoles() {
        try {
            const apiData = await API.graphql({ query: listRoles });
            const rolesFromAPI = apiData.data.listRoles.items;

            // Sort roles based on the "order" field
            rolesFromAPI.sort((a, b) => a.order - b.order);

            setRoles(rolesFromAPI);
        } catch (error) {
            console.error("Error fetching roles:", error);
        }
    }

    async function fetchEmployees() {
        try {
            const apiData = await API.graphql({ query: listEmployees });
            console.log("API Data:", apiData);

            const employeesFromAPI = apiData.data.listEmployees.items;

            const sortedEmployees = employeesFromAPI.sort((a, b) => {
                const employeeNumberA = a.employeeNumber;
                const employeeNumberB = b.employeeNumber;

                if (sortOrder === "desc") {
                    return employeeNumberA - employeeNumberB;
                } else {
                    return employeeNumberB - employeeNumberA;
                }
            });

            const hierarchicalData = buildHierarchy(employeesFromAPI);

            console.log("Employees:", employeesFromAPI);

            // console.log(JSON.stringify(hierarchicalData, null, 2));
            setEmployees(sortedEmployees);
            setHierarchicalData(hierarchicalData);

        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    }

    async function createEmployee(event) {
        setShowEmployeeCreateModal(false);
        event.preventDefault();

        const form = new FormData(event.target);
        const email = form.get("email"); // Get the email field value

        // Generate Gravatar URL
        const gravatarUrl = `https://www.gravatar.com/avatar/${md5(email)}?d=identicon&s=200`;

        try {
            // Fetch existing employees to determine the maximum employee number
            const apiData = await API.graphql({ query: listEmployees });
            const existingEmployeesFromAPI = apiData.data.listEmployees.items;

            // Determine the maximum employee number
            const maxEmployeeNumber = Math.max(...existingEmployeesFromAPI.map(employee => employee.employeeNumber), 0);

            // Calculate the next employee number
            const nextEmployeeNumber = maxEmployeeNumber + 1;

            const data = {
                firstName: form.get("firstName"),
                lastName: form.get("lastName"),
                birthDate: form.get("birthDate"),
                employeeNumber: nextEmployeeNumber,
                salary: form.get("salary"),
                role: form.get("role"),
                reportingLineManager: form.get("reportingLineManager"),
                email: email,
                avatar: gravatarUrl,
            };

            await API.graphql({
                query: createEmployeeMutation,
                variables: { input: data },
            });

            fetchEmployees();
            setStartDate(new Date());
            event.target.reset();
        } catch (error) {
            console.error("Error creating employee:", error);
        }
    }

    const getRoleNameById = (roleId) => {
        const role = roles.find((r) => r.id === roleId);
        return role ? role.name : 'N/A'; // Return 'N/A' if the role is not found
    };

    async function getReportingLineManagerById(managerId) {
        try {
            const apiData = await API.graphql({
                query: getEmployee, // Assume you have a query named getEmployee to fetch individual employee details
                variables: { id: managerId },
            });

            const managerData = apiData.data.getEmployee; // Adjust this based on your actual GraphQL schema

            return managerData;
        } catch (error) {
            console.error("Error fetching reporting line manager details:", error);
            return null;
        }
    }


// ...


    async function deleteEmployee(id) {
        setShowOptionsModal(false);

        // Find the employee being deleted
        const deletedEmployee = employees.find((employee) => employee.id === id);

        // Find employees whose reporting line manager is the deleted employee
        const affectedEmployees = employees.filter(
            (employee) => employee.reportingLineManager === id
        );

        // Update reporting line manager for affected employees
        const updatedEmployees = employees.map((employee) => {
            if (employee.id === id) {
                return null; // Exclude the deleted employee from the new array
            } else if (affectedEmployees.includes(employee)) {
                // Update reporting line manager for affected employees
                return { ...employee, reportingLineManager: deletedEmployee.reportingLineManager };
            } else {
                return employee;
            }
        }).filter(Boolean); // Remove null entries

        setEmployees(updatedEmployees);

        try {
            // Update reporting line manager in the database
            const updatePromises = affectedEmployees.map(async (employee) => {
                await API.graphql({
                    query: updateEmployee,
                    variables: {
                        input: {
                            id: employee.id,
                            reportingLineManager: deletedEmployee.reportingLineManager,
                        },
                    },
                });
            });

            // Wait for all updates to complete
            await Promise.all(updatePromises);

            // Perform the actual deletion with the GraphQL mutation
            await API.graphql({
                query: deleteEmployeeMutation,
                variables: { input: { id } },
            });
        } catch (error) {
            console.error('Error updating reporting line manager:', error);
        }
    }

    const UpdateField = ({ label, value, onUpdate, isDropdown = false, options = [] }) => {
        const [editing, setEditing] = useState(false);
        const [newValue, setNewValue] = useState(value);

        const handleUpdate = () => {
            onUpdate(newValue);
            setEditing(false);
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <p>{label}: {editing ? (
                    isDropdown ? (
                        <SelectField
                            name={label.toLowerCase()} // Use a unique name for each field
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                        >
                            {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </SelectField>
                    ) : (
                        <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                    )
                ) : (
                    value
                )}</p>
                {editing ? (
                    <>
                        <Button variation="primary" style={{marginLeft: 20}} onClick={handleUpdate}>Save</Button>
                        <Button variation="primary" style={{marginLeft: 20}} onClick={() => { setEditing(false); setNewValue(value); }}>Cancel</Button>
                    </>
                ) : (
                    <Button variation="primary" style={{marginLeft: 50}} onClick={() => setEditing(true)}>Edit</Button>
                )}
            </div>
        );
    };

    const handleUpdate = async (field, value) => {
        try {
            console.log(`Updating ${field} to ${value} for employee ${selectedEmployeeId}`);

            const input = {
                id: selectedEmployeeId,
                [field]: value,
            };

            await API.graphql({
                query: updateEmployee,
                variables: { input },
            });

            const updatedEmployeeData = await API.graphql({
                query: getEmployee,
                variables: { id: selectedEmployeeId },
            });

            const updatedEmployee = updatedEmployeeData.data.getEmployee;

            setSelectedEmployeeData(updatedEmployee);

            console.log('Update successful');

            // Refetch the updated employee data
            fetchEmployees();
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
        }
    };

    const buildHierarchy = (employees) => {
        const employeeMap = new Map();

        employees.forEach((employee) => {
            employee.children = [];
            employeeMap.set(employee.id, employee);
        });

        const rootEmployees = [];

        // Build the hierarchy
        employees.forEach((employee) => {
            const reportingLineManagerId = employee.reportingLineManager;
            const reportingLineManager = employeeMap.get(reportingLineManagerId);

            if (reportingLineManager) {
                reportingLineManager.children.push(employee);
            } else {
                rootEmployees.push(employee);
            }
        });

        return rootEmployees;
    };

// Usage


    async function handleTreeNav() {
        await fetchEmployees();
        const updatedHierarchicalData = buildHierarchy(employees);
        navigate('/tree', {state: {yourData: updatedHierarchicalData}});
    }

    return (
        <View className="App">
            <Heading level={1}>Employee Management System</Heading>
            <Heading level={2}>Current Employees</Heading>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="button-container">
                    <Button variation="primary" onClick={handleEmployeeCreateClick}>Add Employee</Button>
                </div>
                <div className="button-container" >
                    <Button variation="primary" onClick={handleTreeNav}>View Tree</Button>
                </div>
            </div>

            <ScrollView>
                <div className="table-container">
                    <Table>
                        <TableHeader/>
                        <TableBody>
                            {employees.map((employee) => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">{employee.employeeNumber}</TableCell>
                                    <TableCell>{employee.firstName && employee.lastName ? `${employee.firstName} ${employee.lastName}` : 'N/A'}</TableCell>
                                    <TableCell>{getRoleNameById(employee.role)}</TableCell>
                                    <TableCell className="text-right">
                                        {employee.reportingLineManager &&
                                            existingEmployees.find(emp => emp.id === employee.reportingLineManager)?.firstName +
                                            ' ' +
                                            existingEmployees.find(emp => emp.id === employee.reportingLineManager)?.lastName +
                                            ' ' +
                                            "("+getRoleNameById(existingEmployees.find(emp => emp.id === employee.reportingLineManager)?.role)+")"
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Button variation="primary" onClick={() => handleOptionsClick(employee.id)}>
                                            &hellip;
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </ScrollView>

            {showOptionsModal && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={closeOptionsModal}>&times;</span>
                        <div>
                            <p style={{fontWeight: "bold", fontSize: 20}}>Options</p>
                        </div>
                        <Button variation="primary" style={{marginTop: 70}} onClick={() => handleEmployeeClick(selectedEmployeeId)}>
                            View/Update Employee Data
                        </Button>
                        <Button variation="primary" style={{marginTop: 20, marginRight: 10}} onClick={() => deleteEmployee(selectedEmployeeId)}>
                            Delete Employee
                        </Button>
                    </div>
                </div>
            )}

            {showEmployeeCreateModal && (
                <div className="modal">
                    <div className="modal-create">
                        <span className="close" onClick={closeEmployeeCreateModal}>&times;</span>
                        <div>
                            <p style={{fontWeight: "bold", fontSize: 30, marginTop:30}}>Create Employee</p>
                        </div>
                        <div>
                            <View as="form" margin="3rem 0" onSubmit={createEmployee}>
                                <Flex direction="column" justifyContent="center">
                                    <TextField
                                        name="firstName"
                                        placeholder="First Name"
                                        label="First Name"
                                        labelHidden
                                        variation="quiet"
                                        required
                                    />
                                    <TextField
                                        name="lastName"
                                        placeholder="Last Name"
                                        label="Last Name"
                                        labelHidden
                                        variation="quiet"
                                        required
                                    />

                                    <TextField
                                        name="email"
                                        placeholder="Email"
                                        label="Email"
                                        labelHidden
                                        variation="quiet"
                                        type="email"
                                        required
                                    />
                                    <TextField
                                        name="salary"
                                        placeholder="Salary"
                                        label="Salary"
                                        labelHidden
                                        variation="quiet"
                                        type="number"
                                        required
                                    />
                                    <SelectField
                                        name="role"
                                        label="Role/Position"
                                        labelHidden
                                        variation="quiet"
                                        required
                                    >
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <SelectField
                                        name="reportingLineManager"
                                        label="Reporting Line Manager"
                                        labelHidden
                                        variation="quiet"
                                    >
                                        <option value="">Select Reporting Line Manager</option>
                                        {existingEmployees.map((employee) => (
                                            <option key={employee.id} value={employee.id}>
                                                {`${employee.firstName} ${employee.lastName} (${getRoleNameById(employee.role)})`}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <div style={{marginLeft: 250, padding:20}}>
                                        <Flex alignItems="center">
                                            <Text marginRight="1rem">Birth Date</Text>
                                            <DatePicker
                                                name="birthDate"
                                                placeholderText="Birth Date"
                                                selected={startDate}
                                                onChange={(date) => setStartDate(date)}
                                                dateFormat="yyyy-MM-dd"
                                                required
                                            />
                                        </Flex>
                                    </div>

                                    <Button type="submit" variation="primary">
                                        Create Employee
                                    </Button>
                                </Flex>
                            </View>
                        </div>

                    </div>
                </div>
            )}

            {showEmployeeModal && (
                <div className="modal2">
                    <div className="modal-content2" style={{ textAlign: 'left' }}>
                        <span className="close" onClick={closeEmployeeModal}>&times;</span>
                        {selectedEmployeeData && (
                            <div>
                                <CircularImage imageUrl={selectedEmployeeData.avatar} altText={selectedEmployeeData.firstName} />
                            </div>
                        )}
                        <div style={{marginTop:20}}>
                            <p style={{fontWeight: "bold", fontSize: 30}}>Update Employee Information</p>
                        </div>

                        {selectedEmployeeData && (
                            <div style={{ marginTop: 20 }}>
                                <UpdateField
                                    label="First Name"
                                    value={`${selectedEmployeeData.firstName}`}
                                    onUpdate={(value) => handleUpdate('firstName', value)}
                                />
                                <UpdateField
                                    label="First Name"
                                    value={`${selectedEmployeeData.lastName}`}
                                    onUpdate={(value) => handleUpdate('lastName', value)}
                                />
                                <UpdateField
                                    label="Employee Number"
                                    value={selectedEmployeeData.employeeNumber}
                                    onUpdate={(value) => handleUpdate('employeeNumber', value)}
                                />
                                <UpdateField
                                    label="Birth Date"
                                    value={selectedEmployeeData.birthDate}
                                    onUpdate={(value) => handleUpdate('birthDate', value)}
                                />
                                <UpdateField
                                    label="Salary"
                                    value={selectedEmployeeData.salary}
                                    onUpdate={(value) => handleUpdate('salary', value)}
                                />
                                <UpdateField
                                    label="Role"
                                    value={getRoleNameById(selectedEmployeeData.role)}
                                    onUpdate={(value) => handleUpdate('role', value)}
                                    isDropdown={true}
                                    options={roles}
                                />
                                <UpdateField
                                    label="Reporting Line Manager"
                                    value={selectedEmployeeData.reportingLineManager}
                                    onUpdate={(value) => handleUpdate('reportingLineManager', value)}
                                    isDropdown={true}
                                    options={existingEmployees}
                                />
                                {/* Add more fields as needed */}
                            </div>
                        )}
                    </div>
                </div>
            )}


            <div className="margin-top-50">
                <Button variation="primary" onClick={signOut}>Sign Out</Button>
            </div>
        </View>
    );
};

export default withAuthenticator(App);


