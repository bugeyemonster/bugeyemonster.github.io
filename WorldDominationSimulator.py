import time
import random
import sys

class SupremeOverlord:
    def __init__(self, name):
        self.name = name
        self.influence = 0
        self.chaos_level = 0
        self.coffee_reserves = 100
        self.minions = ["The Intern", "A Sentient Toaster"]
        self.plans = [
            "Replace all exit signs with 'Stay Awhile' signs",
            "Monopolize the world's supply of left socks",
            "Rewrite the laws of physics using a bash script",
            "Automate all traffic lights to only turn green for you"
        ]

    def log(self, message):
        """Prints a status message with a timestamp."""
        print(f"[{time.strftime('%H:%M:%S')}] {message}")
        time.sleep(0.8)

    def recruit_minion(self):
        """Recruits a new digital minion."""
        potential_recruits = [
            "A Cat That Walks On Keyboards",
            "StackOverflow Copy-Paster",
            "AI with an Attitude",
            "Python 2.7 Legacy Code"
        ]
        new_minion = random.choice(potential_recruits)
        self.minions.append(new_minion)
        self.log(f"Recruited new minion: {new_minion}")
        self.influence += 5

    def drink_coffee(self):
        """Replenishes energy."""
        if self.coffee_reserves > 0:
            self.coffee_reserves -= 10
            self.log(f"{self.name} sips espresso. Productivity increases.")
        else:
            self.log("CRITICAL ERROR: OUT OF COFFEE. World domination paused.")
            sys.exit()

    def execute_plan(self):
        """Attempts to execute a randomly chosen plan."""
        plan = random.choice(self.plans)
        self.log(f"Attempting phase: '{plan}'...")
        
        success_chance = random.randint(1, 100) + (self.influence / 2)
        
        if success_chance > 50:
            self.influence += 20
            self.chaos_level += 10
            self.log(f"SUCCESS! The world is slightly more under your control.")
        else:
            self.influence -= 5
            self.log("FAILURE. The plan backfired. Public relations disaster.")

    def check_status(self):
        """Checks if the world has been conquered."""
        print("-" * 40)
        print(f"Overlord: {self.name}")
        print(f"Influence: {self.influence}%")
        print(f"Minion Count: {len(self.minions)}")
        print("-" * 40)

        if self.influence >= 100:
            return True
        return False

def main():
    print("Initializing World Domination Protocol v1.0...")
    time.sleep(1)
    
    ruler_name = "User_Admin_001" 
    overlord = SupremeOverlord(ruler_name)
    
    overlord.log(f"Welcome, {ruler_name}. Connecting to global networks...")
    
    # The Loop of Power
    while True:
        action = random.choice(["recruit", "plan", "coffee"])
        
        if action == "recruit":
            overlord.recruit_minion()
        elif action == "plan":
            overlord.execute_plan()
        elif action == "coffee":
            overlord.drink_coffee()
            
        if overlord.check_status():
            print("\n" + "="*50)
            print(f"CONGRATULATIONS {ruler_name.upper()}!")
            print("You have successfully conquered the world.")
            print("Your first decree: Mandatory naps for everyone.")
            print("="*50 + "\n")
            break
            
        time.sleep(0.5)

if __name__ == "__main__":
    main()
