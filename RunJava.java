class RunJava{
    public static void main(String[] args){
        System.out.println(
            String.join(" ",
                    "system/Patient.rs",
                    "system/Coverage.rs",
                    "system/CareTeam.rs",
                    "system/AllergyIntolerance.rs",
                    "system/MedicationDispense.rs",
                    "system/Medication.rs",
                    "system/MedicationRequest.rs",
                    "system/Observation.rs",
                    "system/ServiceRequest.rs",
                    "system/Organization.rs",
                    "system/Practitioner.rs"));
    }
}